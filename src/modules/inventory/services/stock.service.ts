import { prisma } from "@/lib/db";
import { StockTransactionType } from "@prisma/client";
import {
  RecordStockConsumptionInput,
  RestockBulkEquipmentInput,
} from "../contracts/stock.contract";
import {
  applyDirectConsumption,
  applyRestock,
  isLowStock,
} from "../domain/stock-math";

/**
 * Records direct match-day consumption (Clarification 1 & SRS §3.2).
 * Direct expenditure with no return expectation (e.g. 2 new match balls for league match).
 * Decrements both available and total quantities atomically.
 */
export async function recordDirectConsumption(
  input: RecordStockConsumptionInput,
  actorProfileId: string
) {
  const item = await prisma.equipmentItem.findUnique({
    where: { id: input.equipmentItemId },
  });

  if (!item) {
    throw new Error("Equipment item not found.");
  }

  if (item.isRetired) {
    throw new Error("Cannot consume stock from a retired equipment item.");
  }

  const { newTotal, newAvailable } = applyDirectConsumption(
    item.totalQuantity,
    item.availableQuantity,
    input.quantity
  );

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update stock quantities on the equipment item
    const updatedItem = await tx.equipmentItem.update({
      where: { id: item.id },
      data: {
        totalQuantity: newTotal,
        availableQuantity: newAvailable,
      },
    });

    // 2. Insert immutable StockTransaction record
    const transaction = await tx.stockTransaction.create({
      data: {
        equipmentItemId: item.id,
        transactionType: StockTransactionType.CONSUMPTION,
        quantityDelta: -input.quantity,
        totalQuantityAfter: newTotal,
        availableQuantityAfter: newAvailable,
        recipientProfileId: input.recipientProfileId || null,
        teamOrSquadName: input.teamOrSquadName || null,
        reason: input.reason,
        recordedById: actorProfileId,
      },
    });

    // 3. Write audit log
    await tx.auditLog.create({
      data: {
        actorProfileId,
        action: "EQUIPMENT_STOCK_CONSUMED",
        metadata: {
          equipmentItemId: item.id,
          itemName: item.name,
          quantityConsumed: input.quantity,
          remainingTotal: newTotal,
          remainingAvailable: newAvailable,
          reason: input.reason,
          teamOrSquadName: input.teamOrSquadName,
          isLowStock: isLowStock(newAvailable, item.lowStockThreshold),
        },
      },
    });

    return {
      updatedItem,
      transaction,
      isLowStock: isLowStock(newAvailable, item.lowStockThreshold),
    };
  });

  return result;
}

/**
 * Restocks bulk consumable inventory (e.g. club purchase of 24 balls or 50 cones).
 * Increments both available and total quantities.
 */
export async function restockBulkEquipment(
  input: RestockBulkEquipmentInput,
  actorProfileId: string
) {
  const item = await prisma.equipmentItem.findUnique({
    where: { id: input.equipmentItemId },
  });

  if (!item) {
    throw new Error("Equipment item not found.");
  }

  if (item.isRetired) {
    throw new Error("Cannot restock a retired equipment item.");
  }

  const { newTotal, newAvailable } = applyRestock(
    item.totalQuantity,
    item.availableQuantity,
    input.quantityToAdd
  );

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update quantities
    const updatedItem = await tx.equipmentItem.update({
      where: { id: item.id },
      data: {
        totalQuantity: newTotal,
        availableQuantity: newAvailable,
      },
    });

    // 2. Insert transaction
    const transaction = await tx.stockTransaction.create({
      data: {
        equipmentItemId: item.id,
        transactionType: StockTransactionType.REPLENISHMENT,
        quantityDelta: input.quantityToAdd,
        totalQuantityAfter: newTotal,
        availableQuantityAfter: newAvailable,
        reason: input.reason,
        recordedById: actorProfileId,
      },
    });

    // 3. Audit log
    await tx.auditLog.create({
      data: {
        actorProfileId,
        action: "EQUIPMENT_STOCK_RESTOCKED",
        metadata: {
          equipmentItemId: item.id,
          itemName: item.name,
          quantityAdded: input.quantityToAdd,
          newTotal,
          newAvailable,
        },
      },
    });

    return {
      updatedItem,
      transaction,
    };
  });

  return result;
}
