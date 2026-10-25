import { prisma } from "@/lib/db";
import {
  DamageReportStatus,
  ItemStatus,
  ItemCondition,
  StockTransactionType,
} from "@prisma/client";
import {
  ReportDamageInput,
  ResolveDamageReportInput,
} from "../contracts/damage.contract";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";

/**
 * Submits an equipment damage or loss report.
 * Callable by player, parent (delegated), coach, or admin.
 */
export async function reportDamage(
  input: ReportDamageInput,
  reporterProfileId: string
) {
  const item = await prisma.equipmentItem.findUnique({
    where: { id: input.equipmentItemId },
  });

  if (!item) {
    throw new Error("Equipment item not found.");
  }

  // Create report and conditionally update item maintenance status
  const report = await prisma.$transaction(async (tx) => {
    const createdReport = await tx.equipmentDamageReport.create({
      data: {
        equipmentItemId: input.equipmentItemId,
        equipmentLoanId: input.loanId || null,
        reportedById: reporterProfileId,
        severity: input.severity,
        description: input.description.trim(),
        status: DamageReportStatus.PENDING,
      },
      include: {
        equipmentItem: true,
        reportedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    // If severe damage, automatically route item to UNDER_MAINTENANCE so it cannot be loaned
    if (
      input.severity === "MAJOR" ||
      input.severity === "BEYOND_REPAIR" ||
      input.severity === "LOST"
    ) {
      await tx.equipmentItem.update({
        where: { id: input.equipmentItemId },
        data: {
          status: ItemStatus.UNDER_MAINTENANCE,
          condition: ItemCondition.NEEDS_REPAIR,
        },
      });
    }

    return createdReport;
  });

  // Notify club staff of damage incident
  try {
    await notificationService.sendEmail({
      to: "admin@roskildecricket.dk",
      subject: `Equipment Damage / Loss Alert: ${item.name} (${input.severity})`,
      html: `
        <h2>Equipment Incident Reported</h2>
        <p>A new damage report has been submitted:</p>
        <ul>
          <li><strong>Item:</strong> ${item.name} ${item.assetTag ? `(${item.assetTag})` : ""}</li>
          <li><strong>Severity:</strong> ${input.severity}</li>
          <li><strong>Reported By:</strong> ${report.reportedBy.firstName} ${report.reportedBy.lastName}</li>
          <li><strong>Description:</strong> ${input.description}</li>
        </ul>
        <p>Please review and resolve this incident in the Club Admin Console.</p>
      `,
    });
  } catch (err) {
    console.error("Failed to dispatch damage alert notification:", err);
  }

  return report;
}

/**
 * Resolves an equipment damage report.
 * Supported resolutions:
 *  - "REPAIRED": Restores asset to AVAILABLE with GOOD condition.
 *  - "RETIRED_WRITTEN_OFF": Retires asset permanently; records loss write-off.
 *  - "DISMISSED": Retains asset's current state and marks report dismissed.
 */
export async function resolveDamageReport(
  input: ResolveDamageReportInput,
  resolverProfileId: string
) {
  const report = await prisma.equipmentDamageReport.findUnique({
    where: { id: input.reportId },
    include: { equipmentItem: true },
  });

  if (!report) {
    throw new Error("Damage report not found.");
  }

  if (report.status === DamageReportStatus.RESOLVED || report.status === DamageReportStatus.DISMISSED) {
    throw new Error(`Damage report has already been finalized (${report.status}).`);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update report status
    const newReportStatus =
      input.resolution === "DISMISSED"
        ? DamageReportStatus.DISMISSED
        : DamageReportStatus.RESOLVED;

    const updatedReport = await tx.equipmentDamageReport.update({
      where: { id: report.id },
      data: {
        status: newReportStatus,
        resolutionNotes: input.resolutionNotes.trim(),
        resolvedById: resolverProfileId,
        resolvedAt: new Date(),
      },
    });

    const item = report.equipmentItem;

    // 2. Apply resolution effect to equipment item
    if (input.resolution === "REPAIRED") {
      // Check if item is currently out on an active loan
      const activeLoan = await tx.equipmentLoan.findFirst({
        where: {
          equipmentItemId: item.id,
          status: "ACTIVE",
        },
      });

      await tx.equipmentItem.update({
        where: { id: item.id },
        data: {
          condition: ItemCondition.GOOD,
          status: activeLoan ? ItemStatus.ON_LOAN : ItemStatus.AVAILABLE,
        },
      });
    } else if (input.resolution === "RETIRED_WRITTEN_OFF") {
      if (item.trackingType === "SERIALIZED") {
        await tx.equipmentItem.update({
          where: { id: item.id },
          data: {
            status: ItemStatus.RETIRED,
            isRetired: true,
            retiredReason: input.resolutionNotes.trim(),
            retiredAt: new Date(),
            availableQuantity: 0,
          },
        });
      } else {
        // Bulk stock loss write-off
        const newTotal = Math.max(0, item.totalQuantity - 1);
        const newAvailable = Math.max(0, item.availableQuantity - 1);

        await tx.equipmentItem.update({
          where: { id: item.id },
          data: {
            totalQuantity: newTotal,
            availableQuantity: newAvailable,
            status: newAvailable > 0 ? ItemStatus.AVAILABLE : ItemStatus.RETIRED,
          },
        });

        await tx.stockTransaction.create({
          data: {
            equipmentItemId: item.id,
            transactionType: StockTransactionType.WRITE_OFF,
            quantityDelta: -1,
            totalQuantityAfter: newTotal,
            availableQuantityAfter: newAvailable,
            reason: `Damage incident resolution: ${input.resolutionNotes.trim()}`,
            recordedById: resolverProfileId,
          },
        });
      }
    }

    return updatedReport;
  });

  return result;
}

/**
 * Retrieves all damage reports for the coach/admin review queue with replacement cost formatted in DKK.
 */
export async function getDamageReports(status?: DamageReportStatus) {
  const where = status ? { status } : {};

  const reports = await prisma.equipmentDamageReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      equipmentItem: {
        select: {
          id: true,
          name: true,
          assetTag: true,
          category: true,
          condition: true,
          status: true,
          trackingType: true,
          storageLocation: true,
          purchasePriceMinorUnits: true,
        },
      },
      loan: {
        select: {
          id: true,
          borrowerProfile: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      reportedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      resolvedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return reports.map((r) => {
    const priceFormatted =
      r.equipmentItem.purchasePriceMinorUnits !== null
        ? `${(r.equipmentItem.purchasePriceMinorUnits / 100).toLocaleString("da-DK", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} DKK`
        : "N/A";

    return {
      ...r,
      replacementCostFormatted: priceFormatted,
    };
  });
}
