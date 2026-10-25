import { prisma } from "@/lib/db";
import {
  ItemStatus,
  ItemCondition,
  LoanStatus,
  TrackingType,
  StockTransactionType,
} from "@prisma/client";
import {
  CheckoutEquipmentInput,
  CheckinEquipmentInput,
} from "../contracts/loan.contract";
import {
  validateEquipmentStatusTransition,
  determineCheckinStatus,
} from "../domain/equipment-state-machine";
import {
  applyBulkLoanCheckout,
  applyBulkLoanReturn,
} from "../domain/stock-math";
import { calculateDefaultReturnDeadline } from "../domain/return-deadline";
import { isMinor } from "@/modules/auth-rbac/domain/age-rules";
import { resolveMemberContact } from "@/modules/auth-rbac/domain/contact-resolver";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";

/**
 * Executes equipment check-out at pitch-side or clubhouse shed.
 * Handles serialized locking, bulk stock decrements, minor parent accountability binding,
 * and outbound notifications.
 */
export async function checkoutEquipment(
  input: CheckoutEquipmentInput,
  officialProfileId: string
) {
  // 1. Fetch item and borrower
  const item = await prisma.equipmentItem.findUnique({
    where: { id: input.equipmentItemId },
  });

  if (!item) {
    throw new Error("Equipment item not found.");
  }

  if (item.isRetired || item.status === ItemStatus.RETIRED) {
    throw new Error("Cannot check out a retired equipment item.");
  }

  if (item.status === ItemStatus.UNDER_MAINTENANCE) {
    throw new Error("This item is currently under maintenance and cannot be checked out.");
  }

  const borrower = await prisma.memberProfile.findUnique({
    where: { id: input.borrowerProfileId },
    include: {
      parentLinksAsPlayer: {
        include: {
          parent: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
      },
    },
  });

  if (!borrower) {
    throw new Error("Borrower member profile not found.");
  }

  if (borrower.isAnonymized) {
    throw new Error("Cannot check out equipment to an anonymized member.");
  }

  // 2. Determine expected return deadline
  let returnDeadline = input.expectedReturnAt;
  if (!returnDeadline) {
    returnDeadline = calculateDefaultReturnDeadline({
      category: item.category,
      now: new Date(),
    });
  }

  // 3. Minor Player Parent Accountability Check
  const borrowerIsMinor = isMinor(borrower.dateOfBirth, new Date());
  const linkedParents = borrower.parentLinksAsPlayer.map((pl) => ({
    parentId: pl.parent.id,
    firstName: pl.parent.firstName,
    lastName: pl.parent.lastName,
    email: pl.parent.email,
    phone: pl.parent.phone,
  }));

  const contactResolution = resolveMemberContact({
    memberId: borrower.id,
    firstName: borrower.firstName,
    lastName: borrower.lastName,
    email: borrower.email,
    phone: borrower.phone,
    isMinor: borrowerIsMinor,
    linkedParents,
  });

  // 4. Atomic Database Transaction
  const loan = await prisma.$transaction(async (tx) => {
    // For serialized items: Verify item is AVAILABLE and has no active loan
    if (item.trackingType === TrackingType.SERIALIZED) {
      if (item.status !== ItemStatus.AVAILABLE) {
        throw new Error(
          `Cannot check out: Item "${item.name}" is currently ${item.status}.`
        );
      }

      const activeLoan = await tx.equipmentLoan.findFirst({
        where: {
          equipmentItemId: item.id,
          status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
        },
      });

      if (activeLoan) {
        throw new Error(
          `Asset integrity violation: Serialized item "${item.name}" already has an active loan.`
        );
      }

      // Transition asset status to ON_LOAN
      await tx.equipmentItem.update({
        where: { id: item.id },
        data: {
          status: ItemStatus.ON_LOAN,
          availableQuantity: 0,
        },
      });
    } else {
      // For bulk items: verify available quantity and decrement
      const { newAvailable } = applyBulkLoanCheckout(
        item.availableQuantity,
        input.quantity
      );

      await tx.equipmentItem.update({
        where: { id: item.id },
        data: {
          availableQuantity: newAvailable,
        },
      });
    }

    // Create EquipmentLoan record
    const createdLoan = await tx.equipmentLoan.create({
      data: {
        equipmentItemId: item.id,
        borrowerProfileId: borrower.id,
        quantity: item.trackingType === TrackingType.SERIALIZED ? 1 : input.quantity,
        teamOrSquadName: input.teamOrSquadName || null,
        status: LoanStatus.ACTIVE,
        issuedById: officialProfileId,
        checkedOutAt: new Date(),
        expectedReturnAt: returnDeadline,
        checkoutCondition: input.checkoutCondition || item.condition,
        checkoutNotes: input.checkoutNotes || null,
      },
    });

    // Write audit log
    await tx.auditLog.create({
      data: {
        actorProfileId: officialProfileId,
        targetProfileId: borrower.id,
        action: "EQUIPMENT_CHECKED_OUT",
        metadata: {
          loanId: createdLoan.id,
          equipmentItemId: item.id,
          itemName: item.name,
          assetTag: item.assetTag,
          borrowerName: `${borrower.firstName} ${borrower.lastName}`,
          isMinor: borrowerIsMinor,
          linkedParentCount: linkedParents.length,
          quantity: createdLoan.quantity,
          expectedReturnAt: returnDeadline.toISOString(),
        },
      },
    });

    return createdLoan;
  });

  // 5. Dispatch notification to borrower / linked parents
  if (contactResolution.allEmails.length > 0) {
    const parentNotice = borrowerIsMinor && linkedParents.length > 0
      ? `<p style="color: #0284c7; font-weight: bold;">Note: As a registered parent/guardian, this club equipment has been checked out under your supervision and responsibility.</p>`
      : "";

    await notificationService.sendEmail({
      to: contactResolution.allEmails,
      subject: `Equipment Checkout Confirmation: ${item.name}`,
      html: `
        <h2>Roskilde Cricket Club - Equipment Checkout</h2>
        <p>Hello ${borrower.firstName},</p>
        <p>The following club equipment has been checked out to you:</p>
        <ul>
          <li><strong>Item:</strong> ${item.name} ${item.assetTag ? `(${item.assetTag})` : ""}</li>
          <li><strong>Quantity:</strong> ${loan.quantity}</li>
          <li><strong>Expected Return Deadline:</strong> ${returnDeadline.toLocaleDateString("da-DK")} 23:59</li>
          <li><strong>Condition at Checkout:</strong> ${loan.checkoutCondition}</li>
        </ul>
        ${parentNotice}
        <p>Please ensure all gear is treated with care and returned promptly for fellow club members.</p>
      `,
    });
  }

  return {
    loan,
    isMinor: borrowerIsMinor,
    parentCount: linkedParents.length,
    expectedReturnAt: returnDeadline,
  };
}

/**
 * Executes equipment check-in / return upon pitch-side reception.
 * Routes damaged gear (`NEEDS_REPAIR`) to `UNDER_MAINTENANCE` and restores bulk stock.
 */
export async function checkinEquipment(
  input: CheckinEquipmentInput,
  officialProfileId: string
) {
  const loan = await prisma.equipmentLoan.findUnique({
    where: { id: input.loanId },
    include: {
      equipmentItem: true,
      borrowerProfile: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (!loan) {
    throw new Error("Loan record not found.");
  }

  if (loan.status === LoanStatus.RETURNED || loan.returnedAt) {
    throw new Error("This equipment loan has already been closed and returned.");
  }

  const item = loan.equipmentItem;
  const returnedStatus = determineCheckinStatus(input.returnCondition);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update loan record
    const updatedLoan = await tx.equipmentLoan.update({
      where: { id: loan.id },
      data: {
        status: input.returnCondition === ItemCondition.RETIRED ? LoanStatus.LOST : LoanStatus.RETURNED,
        returnedAt: new Date(),
        receivedById: officialProfileId,
        returnCondition: input.returnCondition,
        returnNotes: input.returnNotes || null,
      },
    });

    // 2. Update equipment item status & stock
    if (item.trackingType === TrackingType.SERIALIZED) {
      await tx.equipmentItem.update({
        where: { id: item.id },
        data: {
          status: returnedStatus,
          condition: input.returnCondition,
          availableQuantity: returnedStatus === ItemStatus.AVAILABLE ? 1 : 0,
        },
      });
    } else {
      // Bulk return calculation
      const returnedUnits = input.returnedQuantity !== undefined ? input.returnedQuantity : loan.quantity;
      const lostUnits = input.lostQuantity || 0;

      const { newTotal, newAvailable } = applyBulkLoanReturn(
        item.totalQuantity,
        item.availableQuantity,
        returnedUnits,
        lostUnits
      );

      await tx.equipmentItem.update({
        where: { id: item.id },
        data: {
          totalQuantity: newTotal,
          availableQuantity: newAvailable,
        },
      });

      // If units were lost, log a write-off transaction
      if (lostUnits > 0) {
        await tx.stockTransaction.create({
          data: {
            equipmentItemId: item.id,
            transactionType: StockTransactionType.WRITE_OFF,
            quantityDelta: -lostUnits,
            totalQuantityAfter: newTotal,
            availableQuantityAfter: newAvailable,
            reason: `Lost units during loan ${loan.id}: ${input.returnNotes || "Unreturned units"}`,
            recordedById: officialProfileId,
          },
        });
      }
    }

    // 3. Write audit log
    await tx.auditLog.create({
      data: {
        actorProfileId: officialProfileId,
        targetProfileId: loan.borrowerProfileId,
        action: "EQUIPMENT_CHECKED_IN",
        metadata: {
          loanId: loan.id,
          equipmentItemId: item.id,
          itemName: item.name,
          returnedCondition: input.returnCondition,
          newAssetStatus: returnedStatus,
          notes: input.returnNotes,
        },
      },
    });

    return {
      loan: updatedLoan,
      newStatus: returnedStatus,
    };
  });

  return result;
}

/**
 * Retrieves all currently active and overdue equipment loans.
 */
export async function getActiveEquipmentLoans() {
  return await prisma.equipmentLoan.findMany({
    where: {
      status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
    },
    orderBy: { expectedReturnAt: "asc" },
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
        },
      },
      borrowerProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
      issuedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

/**
 * Retrieves active candidate members eligible to borrow equipment.
 */
export async function getCandidateBorrowers() {
  const members = await prisma.memberProfile.findMany({
    where: { isAnonymized: false },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      email: true,
      roleAssignments: { select: { role: true } },
      parentLinksAsPlayer: {
        include: {
          parent: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return members.map((m) => {
    const minor = isMinor(m.dateOfBirth, new Date());
    return {
      id: m.id,
      name: `${m.firstName} ${m.lastName}`.trim(),
      email: m.email,
      roles: m.roleAssignments.map((ra) => ra.role),
      isMinor: minor,
      parents: m.parentLinksAsPlayer.map((pl) => `${pl.parent.firstName} ${pl.parent.lastName}`),
    };
  });
}
