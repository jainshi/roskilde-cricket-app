import { EquipmentCategory } from "@prisma/client";

export interface ReturnDeadlineCalculationParams {
  category: EquipmentCategory;
  now?: Date;
  seasonEndDate?: Date | null;
}

/**
 * Returns a new Date set to 23:59:59.999 on the same local calendar day.
 */
export function getEndOfLocalDay(baseDate: Date): Date {
  const d = new Date(baseDate);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Adds N calendar days to a date and sets the time to 23:59:59.999.
 */
export function addLocalDays(baseDate: Date, days: number): Date {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Calculates the intelligent default return deadline for equipment checkout
 * based on equipment category (Clarification 2):
 * - FACILITY_KEYS, BOWLING_BALLS (match day loans): Same-Day 23:59:59
 * - BATTING, PROTECTIVE, TRAINING_GROUND: +7 calendar days at 23:59:59
 * - APPAREL_KIT: End of playing season if defined and in future, otherwise +180 days at 23:59:59
 */
export function calculateDefaultReturnDeadline(
  params: ReturnDeadlineCalculationParams
): Date {
  const { category, now = new Date(), seasonEndDate } = params;

  switch (category) {
    case EquipmentCategory.FACILITY_KEYS:
    case EquipmentCategory.BOWLING_BALLS:
      // Same-day match / facility access loan
      return getEndOfLocalDay(now);

    case EquipmentCategory.BATTING:
    case EquipmentCategory.PROTECTIVE:
    case EquipmentCategory.TRAINING_GROUND:
      // Standard 7-day loan for player gear and practice equipment
      return addLocalDays(now, 7);

    case EquipmentCategory.APPAREL_KIT:
      // Season-long loan for team kit bags and jerseys
      if (seasonEndDate && seasonEndDate.getTime() > now.getTime()) {
        return getEndOfLocalDay(seasonEndDate);
      }
      return addLocalDays(now, 180);

    default:
      return addLocalDays(now, 7);
  }
}
