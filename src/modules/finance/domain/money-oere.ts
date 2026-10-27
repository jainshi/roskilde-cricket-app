/**
 * Money and Øre Domain Rules
 *
 * All monetary amounts are stored strictly as integer minor units (øre),
 * where 100 øre = 1.00 DKK. Prohibits floating-point representation for currency storage.
 */

/**
 * Converts integer øre to decimal Danish Kroner (for display calculations only).
 */
export function oereToDkk(oere: number): number {
  if (!Number.isInteger(oere)) {
    throw new TypeError(`Amount in øre must be an integer, received: ${oere}`);
  }
  return oere / 100;
}

/**
 * Converts decimal Danish Kroner to integer øre using deterministic rounding.
 */
export function dkkToOere(dkk: number): number {
  if (typeof dkk !== "number" || isNaN(dkk)) {
    throw new TypeError(`Amount in DKK must be a valid number, received: ${dkk}`);
  }
  return Math.round(dkk * 100);
}

/**
 * Formats an amount in integer øre to the official Danish currency representation.
 * Example: 180000 øre -> "1.800,00 kr."
 * Example: 75000 øre -> "750,00 kr."
 * Example: 0 øre -> "0,00 kr."
 */
export function formatDanishKroner(
  oere: number,
  options?: { includeSuffix?: boolean; showPlusSign?: boolean }
): string {
  const { includeSuffix = true, showPlusSign = false } = options || {};

  if (!Number.isInteger(oere)) {
    throw new TypeError(`Amount in øre must be an integer, received: ${oere}`);
  }

  const isNegative = oere < 0;
  const absOere = Math.abs(oere);
  const kroner = Math.floor(absOere / 100);
  const remainingOere = absOere % 100;

  // Format kroner with Danish thousands separator (period)
  const kronerFormatted = kroner
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Pad remaining øre to 2 digits
  const oereFormatted = remainingOere.toString().padStart(2, "0");

  let result = `${kronerFormatted},${oereFormatted}`;

  if (isNegative) {
    result = `-${result}`;
  } else if (showPlusSign && oere > 0) {
    result = `+${result}`;
  }

  if (includeSuffix) {
    result = `${result} kr.`;
  }

  return result;
}

/**
 * Computes a percentage discount on an integer øre amount deterministically using Math.round.
 * Guaranteed to return an integer minor unit.
 *
 * @param amountOere - Base price in øre
 * @param percent - Discount percentage between 0 and 100
 */
export function calculatePercentageDiscount(
  amountOere: number,
  percent: number
): number {
  if (!Number.isInteger(amountOere)) {
    throw new TypeError(`Base amount must be an integer in øre, received: ${amountOere}`);
  }
  if (percent < 0 || percent > 100) {
    throw new RangeError(`Discount percentage must be between 0 and 100, received: ${percent}`);
  }
  if (amountOere <= 0 || percent === 0) {
    return 0;
  }

  return Math.round((amountOere * percent) / 100);
}

/**
 * Calculates the remaining balance in øre after deducting payments.
 * Clamped to 0 (never negative).
 */
export function calculateRemainingBalanceOere(
  totalOere: number,
  paidOere: number
): number {
  if (!Number.isInteger(totalOere) || !Number.isInteger(paidOere)) {
    throw new TypeError(`Amounts must be integers in øre`);
  }
  return Math.max(0, totalOere - paidOere);
}

/**
 * Safely sums an array of integer øre amounts.
 */
export function sumOere(amounts: number[]): number {
  return amounts.reduce((acc, curr) => {
    if (!Number.isInteger(curr)) {
      throw new TypeError(`Every item in amounts must be an integer, received: ${curr}`);
    }
    return acc + curr;
  }, 0);
}
