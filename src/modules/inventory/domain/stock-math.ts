export interface BulkLoanCheckoutResult {
  newAvailable: number;
}

export interface BulkLoanReturnResult {
  newTotal: number;
  newAvailable: number;
  lostCount: number;
}

export interface DirectConsumptionResult {
  newTotal: number;
  newAvailable: number;
}

export interface RestockResult {
  newTotal: number;
  newAvailable: number;
}

export interface WriteOffResult {
  newTotal: number;
  newAvailable: number;
}

/**
 * Decrements available stock for a temporary returnable loan. Total stock remains unchanged.
 */
export function applyBulkLoanCheckout(
  currentAvailable: number,
  quantity: number
): BulkLoanCheckoutResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Checkout quantity must be a positive integer.");
  }

  if (quantity > currentAvailable) {
    throw new Error(
      `Insufficient stock available: requested ${quantity}, but only ${currentAvailable} available.`
    );
  }

  return {
    newAvailable: currentAvailable - quantity,
  };
}

/**
 * Restores returned stock to available inventory.
 * If units were lost (e.g., cricket balls lost in tall grass), decrements total stock accordingly.
 */
export function applyBulkLoanReturn(
  currentTotal: number,
  currentAvailable: number,
  returnedQty: number,
  lostQty = 0
): BulkLoanReturnResult {
  if (!Number.isInteger(returnedQty) || returnedQty < 0) {
    throw new Error("Returned quantity must be a non-negative integer.");
  }

  if (!Number.isInteger(lostQty) || lostQty < 0) {
    throw new Error("Lost quantity must be a non-negative integer.");
  }

  const newTotal = currentTotal - lostQty;
  if (newTotal < 0) {
    throw new Error("Total inventory quantity cannot drop below zero.");
  }

  const newAvailable = currentAvailable + returnedQty;
  if (newAvailable > newTotal) {
    throw new Error(
      `Stock invariant violation: available quantity (${newAvailable}) cannot exceed total quantity (${newTotal}).`
    );
  }

  return {
    newTotal,
    newAvailable,
    lostCount: lostQty,
  };
}

/**
 * Direct expenditure with no return expected (e.g. league match balls, scorebooks, grip tape).
 * Decrements both available and total quantities immediately.
 */
export function applyDirectConsumption(
  currentTotal: number,
  currentAvailable: number,
  consumedQty: number
): DirectConsumptionResult {
  if (!Number.isInteger(consumedQty) || consumedQty <= 0) {
    throw new Error("Consumed quantity must be a positive integer.");
  }

  if (consumedQty > currentAvailable) {
    throw new Error(
      `Insufficient stock for consumption: requested ${consumedQty}, but only ${currentAvailable} available in stock.`
    );
  }

  const newTotal = currentTotal - consumedQty;
  const newAvailable = currentAvailable - consumedQty;

  if (newTotal < 0 || newAvailable < 0) {
    throw new Error("Inventory quantities cannot drop below zero.");
  }

  return {
    newTotal,
    newAvailable,
  };
}

/**
 * Replenishes bulk consumable stock (e.g., club purchase of match ball boxes).
 * Increments both total and available quantities.
 */
export function applyRestock(
  currentTotal: number,
  currentAvailable: number,
  restockQty: number
): RestockResult {
  if (!Number.isInteger(restockQty) || restockQty <= 0) {
    throw new Error("Restock quantity must be a positive integer.");
  }

  return {
    newTotal: currentTotal + restockQty,
    newAvailable: currentAvailable + restockQty,
  };
}

/**
 * Writes off damaged, expired, or decommissioned stock.
 * If written off from an open loan (e.g. member reported lost), available was already decremented.
 */
export function applyWriteOff(
  currentTotal: number,
  currentAvailable: number,
  writeOffQty: number,
  fromOpenLoan = false
): WriteOffResult {
  if (!Number.isInteger(writeOffQty) || writeOffQty <= 0) {
    throw new Error("Write-off quantity must be a positive integer.");
  }

  const newTotal = currentTotal - writeOffQty;
  if (newTotal < 0) {
    throw new Error("Total inventory quantity cannot drop below zero.");
  }

  let newAvailable = currentAvailable;
  if (!fromOpenLoan) {
    newAvailable = currentAvailable - writeOffQty;
    if (newAvailable < 0) {
      throw new Error("Available inventory quantity cannot drop below zero.");
    }
  }

  return {
    newTotal,
    newAvailable,
  };
}

/**
 * Evaluates whether an item has breached its defined low-stock threshold.
 */
export function isLowStock(
  availableQuantity: number,
  lowStockThreshold?: number | null
): boolean {
  if (lowStockThreshold === undefined || lowStockThreshold === null) {
    return false;
  }
  return availableQuantity <= lowStockThreshold;
}
