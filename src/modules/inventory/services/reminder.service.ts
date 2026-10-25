import { prisma } from "@/lib/db";
import { LoanStatus } from "@prisma/client";
import {
  isLoanOverdue,
  canSendOverdueReminder,
} from "../domain/overdue-evaluator";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";
import { resolveMemberContact } from "@/modules/auth-rbac/domain/contact-resolver";
import { isMinor } from "@/modules/auth-rbac/domain/age-rules";

export interface ReminderDispatchResult {
  evaluatedCount: number;
  remindersSentCount: number;
  skippedCooldownCount: number;
  loansNotified: Array<{
    loanId: string;
    borrowerName: string;
    itemName: string;
    isMinor: boolean;
    recipients: string[];
  }>;
}

/**
 * Evaluates all active and overdue equipment loans, enforces the 24-hour notification
 * cooldown per loan, and dispatches automated reminders to borrowers and linked parents.
 */
export async function evaluateAndDispatchReminders(options?: {
  dryRun?: boolean;
}): Promise<ReminderDispatchResult> {
  const now = new Date();
  const dryRun = options?.dryRun ?? false;

  const candidateLoans = await prisma.equipmentLoan.findMany({
    where: {
      status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
      returnedAt: null,
    },
    include: {
      equipmentItem: {
        select: {
          id: true,
          name: true,
          assetTag: true,
          category: true,
          storageLocation: true,
        },
      },
      borrowerProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          parentLinksAsPlayer: {
            include: {
              parent: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const result: ReminderDispatchResult = {
    evaluatedCount: candidateLoans.length,
    remindersSentCount: 0,
    skippedCooldownCount: 0,
    loansNotified: [],
  };

  for (const loan of candidateLoans) {
    const overdue = isLoanOverdue(
      { expectedReturnAt: loan.expectedReturnAt, returnedAt: loan.returnedAt },
      now
    );

    if (!overdue) {
      continue;
    }

    // Ensure status is marked OVERDUE in database if not already
    if (loan.status !== LoanStatus.OVERDUE && !dryRun) {
      await prisma.equipmentLoan.update({
        where: { id: loan.id },
        data: { status: LoanStatus.OVERDUE },
      });
    }

    // Enforce 24-hour notification cooldown
    const canSend = canSendOverdueReminder(
      { lastReminderSentAt: loan.lastReminderSentAt },
      now,
      24
    );

    if (!canSend) {
      result.skippedCooldownCount++;
      continue;
    }

    const borrower = loan.borrowerProfile;
    const item = loan.equipmentItem;
    const borrowerIsMinor = isMinor(borrower.dateOfBirth, now);

    const linkedParents = borrower.parentLinksAsPlayer.map((pl) => ({
      parentId: pl.parent.id,
      firstName: pl.parent.firstName,
      lastName: pl.parent.lastName,
      email: pl.parent.email,
      phone: pl.parent.phone,
    }));

    const contact = resolveMemberContact({
      memberId: borrower.id,
      firstName: borrower.firstName,
      lastName: borrower.lastName,
      email: borrower.email,
      phone: borrower.phone,
      isMinor: borrowerIsMinor,
      linkedParents,
    });

    if (contact.allEmails.length > 0) {
      if (!dryRun) {
        const parentNotice =
          borrowerIsMinor && linkedParents.length > 0
            ? `<p style="color: #b45309; font-weight: bold; background: #fef3c7; padding: 10px; border-radius: 6px;">
                Parental Responsibility Notice: As the registered parent/guardian for youth player ${borrower.firstName}, please assist in returning this club equipment to the club shed promptly so fellow players can use it.
              </p>`
            : "";

        const daysOverdue = Math.max(
          1,
          Math.floor(
            (now.getTime() - loan.expectedReturnAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        );

        await notificationService.sendEmail({
          to: contact.allEmails,
          subject: `OVERDUE Return Notice: ${item.name} (${daysOverdue} ${daysOverdue > 1 ? "days" : "day"} overdue)`,
          html: `
            <h2>Roskilde Cricket Club - Equipment Return Reminder</h2>
            <p>Dear ${borrower.firstName},</p>
            <p>Our records show that the following club equipment is past its expected return deadline:</p>
            <ul>
              <li><strong>Item:</strong> ${item.name} ${item.assetTag ? `(${item.assetTag})` : ""}</li>
              <li><strong>Storage Shed:</strong> ${item.storageLocation}</li>
              <li><strong>Original Return Deadline:</strong> ${loan.expectedReturnAt.toLocaleDateString("da-DK")} 23:59</li>
              <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
            </ul>
            ${parentNotice}
            <p>If you require an extension, please submit an extension request via your <strong>My Gear</strong> member dashboard on the club portal.</p>
            <p>Thank you for your cooperation and for keeping our club assets accessible to all members.</p>
          `,
        });

        // Update lastReminderSentAt to enforce 24-hour cooldown
        await prisma.equipmentLoan.update({
          where: { id: loan.id },
          data: {
            lastReminderSentAt: now,
            status: LoanStatus.OVERDUE,
          },
        });
      }

      result.remindersSentCount++;
      result.loansNotified.push({
        loanId: loan.id,
        borrowerName: `${borrower.firstName} ${borrower.lastName}`,
        itemName: item.name,
        isMinor: borrowerIsMinor,
        recipients: contact.allEmails,
      });
    }
  }

  return result;
}
