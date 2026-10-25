import { prisma } from "@/lib/db";
import { ItemStatus, Role, Prisma } from "@prisma/client";
import {
  CreateEquipmentItemInput,
  UpdateEquipmentItemInput,
  CatalogFilterInput,
} from "../contracts/catalog.contract";
import { validateEquipmentStatusTransition } from "../domain/equipment-state-machine";
import { isLowStock } from "../domain/stock-math";

/**
 * Formats integer minor currency units (øre) into a localized Danish Kroner (DKK) string.
 * Example: 149900 øre -> "1.499,00 kr." or "1.499,00 DKK"
 */
export function formatDkk(minorUnits?: number | null): string {
  if (minorUnits === null || minorUnits === undefined) {
    return "—";
  }
  const dkk = minorUnits / 100;
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dkk);
}

export interface CatalogItemView {
  id: string;
  assetTag: string | null;
  name: string;
  description: string | null;
  trackingType: string;
  category: string;
  ageGroup: string;
  condition: string;
  status: string;
  storageLocation: string;
  totalQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number | null;
  purchasePriceMinorUnits: number | null;
  purchasePriceFormatted: string;
  isLowStock: boolean;
  isRetired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Retrieves the catalog with rich filtering, search, and computed status indicators.
 */
export async function getEquipmentCatalog(
  filters?: CatalogFilterInput
): Promise<CatalogItemView[]> {
  const where: Prisma.EquipmentItemWhereInput = {};

  if (filters?.category) {
    where.category = filters.category;
  }

  if (filters?.ageGroup) {
    where.ageGroup = filters.ageGroup;
  }

  if (filters?.condition) {
    where.condition = filters.condition;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.trackingType) {
    where.trackingType = filters.trackingType;
  }

  if (filters?.storageLocation) {
    where.storageLocation = {
      contains: filters.storageLocation,
      mode: "insensitive",
    };
  }

  if (filters?.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { assetTag: { contains: term, mode: "insensitive" } },
      { storageLocation: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  const items = await prisma.equipmentItem.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const views: CatalogItemView[] = items.map((item) => {
    const itemIsLowStock = isLowStock(item.availableQuantity, item.lowStockThreshold);
    return {
      id: item.id,
      assetTag: item.assetTag,
      name: item.name,
      description: item.description,
      trackingType: item.trackingType,
      category: item.category,
      ageGroup: item.ageGroup,
      condition: item.condition,
      status: item.status,
      storageLocation: item.storageLocation,
      totalQuantity: item.totalQuantity,
      availableQuantity: item.availableQuantity,
      lowStockThreshold: item.lowStockThreshold,
      purchasePriceMinorUnits: item.purchasePriceMinorUnits,
      purchasePriceFormatted: formatDkk(item.purchasePriceMinorUnits),
      isLowStock: itemIsLowStock,
      isRetired: item.isRetired,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });

  if (filters?.onlyLowStock) {
    return views.filter((v) => v.isLowStock);
  }

  return views;
}

/**
 * Retrieves a single equipment item with full relational context.
 */
export async function getEquipmentItemById(id: string) {
  const item = await prisma.equipmentItem.findUnique({
    where: { id },
    include: {
      loans: {
        orderBy: { checkedOutAt: "desc" },
        take: 10,
        include: {
          borrowerProfile: {
            select: { id: true, firstName: true, lastName: true },
          },
          issuedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      stockTransactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          recordedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      damageReports: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          reportedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!item) {
    return null;
  }

  return {
    ...item,
    purchasePriceFormatted: formatDkk(item.purchasePriceMinorUnits),
    isLowStock: isLowStock(item.availableQuantity, item.lowStockThreshold),
  };
}

/**
 * Creates a new equipment item in the catalog.
 */
export async function createEquipmentItem(
  input: CreateEquipmentItemInput,
  actorProfileId: string
) {
  if (input.assetTag) {
    const existing = await prisma.equipmentItem.findUnique({
      where: { assetTag: input.assetTag },
    });
    if (existing) {
      throw new Error(`An equipment item with asset tag "${input.assetTag}" already exists.`);
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.equipmentItem.create({
      data: {
        assetTag: input.assetTag || null,
        name: input.name,
        description: input.description,
        trackingType: input.trackingType,
        category: input.category,
        ageGroup: input.ageGroup,
        condition: input.condition,
        status: ItemStatus.AVAILABLE,
        storageLocation: input.storageLocation,
        totalQuantity: input.totalQuantity,
        availableQuantity: input.totalQuantity, // Initial available equals total
        lowStockThreshold: input.lowStockThreshold,
        purchasePriceMinorUnits: input.purchasePriceMinorUnits,
        acquisitionDate: input.acquisitionDate,
        warrantyExpiresAt: input.warrantyExpiresAt,
      },
    });

    await tx.auditLog.create({
      data: {
        actorProfileId,
        action: "EQUIPMENT_ITEM_CREATED",
        metadata: {
          equipmentItemId: item.id,
          name: item.name,
          assetTag: item.assetTag,
          category: item.category,
          trackingType: item.trackingType,
          totalQuantity: item.totalQuantity,
        },
      },
    });

    return item;
  });

  return created;
}

/**
 * Updates an existing equipment item with state machine validation and audit logging.
 */
export async function updateEquipmentItem(
  input: UpdateEquipmentItemInput,
  actorProfileId: string,
  actorRoles: Role[]
) {
  const current = await prisma.equipmentItem.findUnique({
    where: { id: input.id },
  });

  if (!current) {
    throw new Error("Equipment item not found.");
  }

  // If status is being modified, validate against state machine
  if (input.status && input.status !== current.status) {
    const validation = validateEquipmentStatusTransition({
      currentStatus: current.status,
      targetStatus: input.status,
      actorRoles,
    });

    if (!validation.valid) {
      throw new Error(validation.error || "Invalid status transition.");
    }
  }

  // If changing asset tag, check uniqueness
  if (input.assetTag && input.assetTag !== current.assetTag) {
    const existing = await prisma.equipmentItem.findUnique({
      where: { assetTag: input.assetTag },
    });
    if (existing && existing.id !== input.id) {
      throw new Error(`An equipment item with asset tag "${input.assetTag}" already exists.`);
    }
  }

  const isBecomingRetired = input.status === ItemStatus.RETIRED;

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.equipmentItem.update({
      where: { id: input.id },
      data: {
        assetTag: input.assetTag !== undefined ? input.assetTag : current.assetTag,
        name: input.name !== undefined ? input.name : current.name,
        description: input.description !== undefined ? input.description : current.description,
        category: input.category !== undefined ? input.category : current.category,
        ageGroup: input.ageGroup !== undefined ? input.ageGroup : current.ageGroup,
        condition: input.condition !== undefined ? input.condition : current.condition,
        status: input.status !== undefined ? input.status : current.status,
        storageLocation:
          input.storageLocation !== undefined ? input.storageLocation : current.storageLocation,
        totalQuantity:
          input.totalQuantity !== undefined ? input.totalQuantity : current.totalQuantity,
        availableQuantity:
          input.availableQuantity !== undefined
            ? input.availableQuantity
            : current.availableQuantity,
        lowStockThreshold:
          input.lowStockThreshold !== undefined
            ? input.lowStockThreshold
            : current.lowStockThreshold,
        purchasePriceMinorUnits:
          input.purchasePriceMinorUnits !== undefined
            ? input.purchasePriceMinorUnits
            : current.purchasePriceMinorUnits,
        acquisitionDate:
          input.acquisitionDate !== undefined ? input.acquisitionDate : current.acquisitionDate,
        warrantyExpiresAt:
          input.warrantyExpiresAt !== undefined
            ? input.warrantyExpiresAt
            : current.warrantyExpiresAt,
        isRetired: isBecomingRetired ? true : current.isRetired,
        retiredAt: isBecomingRetired ? new Date() : current.retiredAt,
        retiredReason: input.retiredReason || current.retiredReason,
      },
    });

    await tx.auditLog.create({
      data: {
        actorProfileId,
        action: "EQUIPMENT_ITEM_UPDATED",
        metadata: {
          equipmentItemId: item.id,
          previousStatus: current.status,
          newStatus: item.status,
          isRetired: item.isRetired,
        },
      },
    });

    return item;
  });

  return updated;
}
