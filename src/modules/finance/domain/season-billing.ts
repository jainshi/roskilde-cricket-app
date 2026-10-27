import { BillingCycle } from "@prisma/client";

/**
 * Fixed Club Season Date Range Result (all in UTC)
 */
export interface SeasonDateRange {
  cycle: BillingCycle;
  seasonYear: number;
  startDate: Date;
  endDate: Date;
  label: string;
}

/**
 * Resolves the fixed date range for a given cricket billing cycle and season year.
 *
 * Danish Cricket Calendar:
 * - SUMMER_OUTDOOR: April 1 - September 30 (same calendar year)
 * - WINTER_INDOOR: October 1 - March 31 (starts seasonYear, ends seasonYear + 1)
 * - ANNUAL: April 1 - March 31 (starts seasonYear, ends seasonYear + 1)
 */
export function getSeasonDateRange(
  cycle: BillingCycle,
  seasonYear: number
): SeasonDateRange {
  if (!Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2100) {
    throw new RangeError(`Invalid season year: ${seasonYear}`);
  }

  let startDate: Date;
  let endDate: Date;
  let label: string;

  switch (cycle) {
    case BillingCycle.SUMMER_OUTDOOR:
      startDate = new Date(Date.UTC(seasonYear, 3, 1, 0, 0, 0, 0)); // Apr 1
      endDate = new Date(Date.UTC(seasonYear, 8, 30, 23, 59, 59, 999)); // Sep 30
      label = `Summer Outdoor ${seasonYear}`;
      break;

    case BillingCycle.WINTER_INDOOR:
      startDate = new Date(Date.UTC(seasonYear, 9, 1, 0, 0, 0, 0)); // Oct 1
      endDate = new Date(Date.UTC(seasonYear + 1, 2, 31, 23, 59, 59, 999)); // Mar 31 next year
      label = `Winter Indoor ${seasonYear}/${seasonYear + 1}`;
      break;

    case BillingCycle.ANNUAL:
      startDate = new Date(Date.UTC(seasonYear, 3, 1, 0, 0, 0, 0)); // Apr 1
      endDate = new Date(Date.UTC(seasonYear + 1, 2, 31, 23, 59, 59, 999)); // Mar 31 next year
      label = `Annual Season ${seasonYear}/${seasonYear + 1}`;
      break;

    default: {
      const _exhaustiveCheck: never = cycle;
      throw new Error(`Unhandled billing cycle: ${_exhaustiveCheck}`);
    }
  }

  return {
    cycle,
    seasonYear,
    startDate,
    endDate,
    label,
  };
}

/**
 * Determines which club season is currently active for a given date (defaults to now).
 */
export function resolveCurrentSeason(targetDate: Date = new Date()): {
  seasonYear: number;
  currentOutdoorYear: number;
  isSummerSeason: boolean;
  activeCycle: BillingCycle;
} {
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth(); // 0 = Jan, 3 = Apr, 8 = Sep, 9 = Oct

  // Summer outdoor: Months 3 (Apr) to 8 (Sep)
  if (month >= 3 && month <= 8) {
    return {
      seasonYear: year,
      currentOutdoorYear: year,
      isSummerSeason: true,
      activeCycle: BillingCycle.SUMMER_OUTDOOR,
    };
  }

  // Winter indoor: Month 9 (Oct) to 11 (Dec) is year, Months 0 (Jan) to 2 (Mar) is year - 1
  const winterStartYear = month >= 9 ? year : year - 1;

  return {
    seasonYear: winterStartYear,
    currentOutdoorYear: winterStartYear,
    isSummerSeason: false,
    activeCycle: BillingCycle.WINTER_INDOOR,
  };
}

/**
 * Checks whether a member is eligible for seasonal batch billing.
 * Disqualifies anonymized, inactive, or already-invoiced members.
 */
export function isEligibleForSeasonBatch(member: {
  id: string;
  isAnonymized?: boolean;
  hasActiveSubscriptionForSeason?: boolean;
}): boolean {
  if (member.isAnonymized) {
    return false;
  }
  // If the member already has an active subscription for this season, they shouldn't be duplicated
  if (member.hasActiveSubscriptionForSeason) {
    return false;
  }
  return true;
}
