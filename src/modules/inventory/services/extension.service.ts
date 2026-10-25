import { prisma } from "@/lib/db";
import { ExtensionStatus, LoanStatus } from "@prisma/client";
import {
  RequestLoanExtensionInput,
  ReviewLoanExtensionInput,
} from "../contracts/extension.contract";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";
import { resolveMemberContact } from "@/modules/auth-rbac/domain/contact-resolver";
import { isMinor } from "@/modules/auth-rbac/domain/age-rules";

/**
 * Submits a new return deadline extension request on an active equipment loan.
 * Supports self-service by borrower as well as delegated requests by linked parents.
 */
export async function requestLoanExtension(
  input: RequestLoanExtensionInput,
  actorProfileId: string
) {
  const loan = await prisma.equipmentLoan.findUnique({
    where: { id: input.loanId },
    include: {
      equipmentItem: true,
      borrowerProfile: {
        include: {
          parentLinksAsPlayer: {
            select: { parentId: true },
          },
        },
      },
      extensions: {
        where: { status: ExtensionStatus.PENDING },
      },
    },
  });

  if (!loan) {
    throw new Error("Loan record not found.");
  }

  if (loan.status === LoanStatus.RETURNED || loan.returnedAt) {
    throw new Error("Cannot request extension for an already returned equipment loan.");
  }

  // Authority check: Actor must be the borrower or a linked parent
  const isBorrower = loan.borrowerProfileId === actorProfileId;
  const isLinkedParent = loan.borrowerProfile.parentLinksAsPlayer.some(
    (link) => link.parentId === actorProfileId
  );

  if (!isBorrower && !isLinkedParent) {
    throw new Error("You do not have permission to request an extension for this loan.");
  }

  // Ensure no existing pending extension request
  if (loan.extensions.length > 0) {
    throw new Error("A pending extension request is already awaiting coach/admin review for this loan.");
  }

  const proposedDate = new Date(input.proposedReturnAt);
  if (isNaN(proposedDate.getTime()) || proposedDate.getTime() <= Date.now()) {
    throw new Error("Proposed return date must be in the future.");
  }

  const extension = await prisma.equipmentLoanExtension.create({
    data: {
      loanId: loan.id,
      requestedById: actorProfileId,
      proposedReturnAt: proposedDate,
      reason: input.reason.trim(),
      status: ExtensionStatus.PENDING,
    },
    include: {
      loan: {
        include: { equipmentItem: true },
      },
      requestedBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return extension;
}

/**
 * Reviews a pending loan extension request (Approve or Reject).
 * Only accessible by official roles (ADMIN, COACH, AD_HOC_COACH).
 */
export async function reviewLoanExtension(
  input: ReviewLoanExtensionInput,
  reviewerProfileId: string
) {
  const extension = await prisma.equipmentLoanExtension.findUnique({
    where: { id: input.extensionId },
    include: {
      loan: {
        include: {
          equipmentItem: true,
          borrowerProfile: {
            include: {
              parentLinksAsPlayer: {
                include: {
                  parent: {
                    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
                  },
                },
              },
            },
          },
        },
      },
      requestedBy: true,
    },
  });

  if (!extension) {
    throw new Error("Extension request not found.");
  }

  if (extension.status !== ExtensionStatus.PENDING) {
    throw new Error(`Extension request has already been reviewed (${extension.status}).`);
  }

  const reviewer = await prisma.memberProfile.findUnique({
    where: { id: reviewerProfileId },
    select: { firstName: true, lastName: true },
  });

  const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "Club Official";

  if (input.decision === "APPROVED") {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark extension approved
      const ext = await tx.equipmentLoanExtension.update({
        where: { id: extension.id },
        data: {
          status: ExtensionStatus.APPROVED,
          reviewedById: reviewerProfileId,
          reviewedAt: new Date(),
        },
      });

      // 2. Extend loan expectedReturnAt
      await tx.equipmentLoan.update({
        where: { id: extension.loanId },
        data: {
          expectedReturnAt: extension.proposedReturnAt,
          status: LoanStatus.ACTIVE, // clears overdue flag if it was overdue
        },
      });

      return ext;
    });

    // Notify borrower / guardians
    const borrower = extension.loan.borrowerProfile;
    const item = extension.loan.equipmentItem;
    const borrowerIsMinor = isMinor(borrower.dateOfBirth, new Date());
    const linkedParents = borrower.parentLinksAsPlayer.map((p) => ({
      parentId: p.parent.id,
      firstName: p.parent.firstName,
      lastName: p.parent.lastName,
      email: p.parent.email,
      phone: p.parent.phone,
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

    for (const email of contact.allEmails) {
      await notificationService.sendEmail({
        to: email,
        subject: `Loan Extension Approved: ${item.name}`,
        html: `
          <h2>Loan Extension Approved</h2>
          <p>Your return date extension for <strong>${item.name}</strong> has been approved by ${reviewerName}.</p>
          <p><strong>New Expected Return Date:</strong> ${extension.proposedReturnAt.toLocaleDateString("da-DK")} 23:59</p>
          <p>Thank you for keeping club gear safe and updated!</p>
        `,
      });
    }

    return { success: true, status: ExtensionStatus.APPROVED };
  } else {
    // REJECTED
    const rejectionReason = input.rejectionReason?.trim() || "Extension request declined by coaching staff.";

    const updated = await prisma.equipmentLoanExtension.update({
      where: { id: extension.id },
      data: {
        status: ExtensionStatus.REJECTED,
        rejectionReason,
        reviewedById: reviewerProfileId,
        reviewedAt: new Date(),
      },
    });

    const borrower = extension.loan.borrowerProfile;
    const item = extension.loan.equipmentItem;
    const borrowerIsMinor = isMinor(borrower.dateOfBirth, new Date());
    const linkedParents = borrower.parentLinksAsPlayer.map((p) => ({
      parentId: p.parent.id,
      firstName: p.parent.firstName,
      lastName: p.parent.lastName,
      email: p.parent.email,
      phone: p.parent.phone,
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

    for (const email of contact.allEmails) {
      await notificationService.sendEmail({
        to: email,
        subject: `Loan Extension Update: ${item.name}`,
        html: `
          <h2>Loan Extension Not Approved</h2>
          <p>Your request to extend the loan for <strong>${item.name}</strong> could not be approved at this time.</p>
          <p><strong>Reason:</strong> ${rejectionReason}</p>
          <p>Please return the equipment by your original deadline: <strong>${extension.loan.expectedReturnAt.toLocaleDateString("da-DK")}</strong>.</p>
        `,
      });
    }

    return { success: true, status: ExtensionStatus.REJECTED };
  }
}

/**
 * Retrieves all pending extension requests for the coach/admin review queue.
 */
export async function getPendingLoanExtensions() {
  return await prisma.equipmentLoanExtension.findMany({
    where: { status: ExtensionStatus.PENDING },
    orderBy: { createdAt: "desc" },
    include: {
      loan: {
        include: {
          equipmentItem: true,
          borrowerProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              dateOfBirth: true,
              parentLinksAsPlayer: {
                include: {
                  parent: {
                    select: { id: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
      },
      requestedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

/**
 * Retrieves all active loans and historical returned loans for a member profile
 * (used by the personal "My Gear" dashboard, supporting parent delegation).
 */
export async function getMemberLoans(profileId: string) {
  const loans = await prisma.equipmentLoan.findMany({
    where: { borrowerProfileId: profileId },
    orderBy: [{ status: "asc" }, { expectedReturnAt: "asc" }],
    include: {
      equipmentItem: {
        select: {
          id: true,
          name: true,
          assetTag: true,
          category: true,
          condition: true,
          trackingType: true,
          storageLocation: true,
          purchasePriceMinorUnits: true,
        },
      },
      extensions: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      damageReports: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  const now = new Date();

  return loans.map((loan) => {
    const isOverdue =
      loan.status === LoanStatus.OVERDUE ||
      (loan.status === LoanStatus.ACTIVE && loan.expectedReturnAt.getTime() < now.getTime());

    const pendingExtension = loan.extensions.find((e) => e.status === ExtensionStatus.PENDING);

    const priceFormatted =
      loan.equipmentItem.purchasePriceMinorUnits !== null
        ? `${(loan.equipmentItem.purchasePriceMinorUnits / 100).toLocaleString("da-DK", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} DKK`
        : "N/A";

    return {
      ...loan,
      isOverdue,
      pendingExtension,
      purchasePriceFormatted: priceFormatted,
    };
  });
}
