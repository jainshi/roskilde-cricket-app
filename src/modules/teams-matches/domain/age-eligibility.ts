/**
 * Domain module: Age-group eligibility calculator
 * Implements Danish Cricket Federation (DCF) age rules:
 * - Age cutoff is January 1st of the competition season year.
 * - Under-age age groups: U11 (<11), U13 (<13), U15 (<15), U17 (<17), U19 (<19).
 * - Senior cricket: Open to players aged 15+. Minors aged 13-17 may play senior cricket ("playing up").
 * - Players under 13 cannot play senior cricket without approved dispensation.
 * - Playing up in youth cricket (younger player in older age group) is permitted with a warning.
 * - Overage players in junior squads are blocked unless explicit dispensation is granted.
 */

export type EligibilityStatus =
  | "ELIGIBLE"
  | "PLAYING_UP"
  | "DISPENSATION_APPROVED"
  | "OVERAGE_BLOCKED"
  | "UNDERAGE_BLOCKED"
  | "INVALID_DOB";

export interface AgeEligibilityResult {
  status: EligibilityStatus;
  isAllowed: boolean;
  ageOnCutoff: number | null;
  seasonYear: number;
  reason: string;
  warning?: string;
}

export interface EligibilityParams {
  dateOfBirth: Date | string | null | undefined;
  ageGroupRule: string | null | undefined; // "U13", "U15", "U17", "U19", "OPEN", etc.
  squadCategory: "SENIOR" | "YOUTH" | "SOCIAL";
  seasonYear?: number;
  hasDispensation?: boolean;
}

/**
 * Calculates a player's age on January 1st of the competition season year.
 */
export function calculateAgeOnCutoff(
  dateOfBirth: Date | string,
  seasonYear: number
): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  if (isNaN(dob.getTime())) {
    throw new Error("Invalid date of birth provided");
  }

  const cutoff = new Date(seasonYear, 0, 1); // Jan 1 of season year
  let age = cutoff.getFullYear() - dob.getFullYear();
  const m = cutoff.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && cutoff.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Parses age cap from rule string like "U15" -> 15, "U13" -> 13.
 */
export function parseAgeCap(ageGroupRule: string | null | undefined): number | null {
  if (!ageGroupRule) return null;
  const match = ageGroupRule.toUpperCase().match(/^U(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Evaluates player eligibility for a squad based on age, category, and dispensation.
 */
export function evaluateAgeEligibility({
  dateOfBirth,
  ageGroupRule,
  squadCategory,
  seasonYear = new Date().getFullYear(),
  hasDispensation = false,
}: EligibilityParams): AgeEligibilityResult {
  if (!dateOfBirth) {
    return {
      status: "INVALID_DOB",
      isAllowed: false,
      ageOnCutoff: null,
      seasonYear,
      reason: "Player date of birth is missing or invalid.",
    };
  }

  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  if (isNaN(dob.getTime())) {
    return {
      status: "INVALID_DOB",
      isAllowed: false,
      ageOnCutoff: null,
      seasonYear,
      reason: "Player date of birth is not a valid date.",
    };
  }

  const age = calculateAgeOnCutoff(dob, seasonYear);

  // 1. Senior & Social Category Evaluation
  if (squadCategory === "SENIOR" || squadCategory === "SOCIAL") {
    if (age >= 15) {
      return {
        status: "ELIGIBLE",
        isAllowed: true,
        ageOnCutoff: age,
        seasonYear,
        reason: `Player is age ${age} on cutoff, fully eligible for adult cricket.`,
      };
    }

    if (age >= 13 && age < 15) {
      return {
        status: "PLAYING_UP",
        isAllowed: true,
        ageOnCutoff: age,
        seasonYear,
        reason: `Youth player (age ${age}) playing up into senior cricket. Parental delegation active.`,
        warning: "Minor player playing in senior team. Dual-parent notification applies.",
      };
    }

    // Under 13
    if (hasDispensation) {
      return {
        status: "DISPENSATION_APPROVED",
        isAllowed: true,
        ageOnCutoff: age,
        seasonYear,
        reason: `Player under 13 (age ${age}) approved for senior play under special DCF dispensation.`,
        warning: "Dispensation granted for under-13 player in senior competition.",
      };
    }

    return {
      status: "UNDERAGE_BLOCKED",
      isAllowed: false,
      ageOnCutoff: age,
      seasonYear,
      reason: `Players under 13 (age ${age}) cannot play in senior squads without approved DCF dispensation.`,
    };
  }

  // 2. Youth Category Evaluation
  const ageCap = parseAgeCap(ageGroupRule);

  // If no age cap defined on youth squad, default to 19
  const effectiveCap = ageCap ?? 19;

  // Over-age check: age >= ageCap on Jan 1
  if (age >= effectiveCap) {
    if (hasDispensation) {
      return {
        status: "DISPENSATION_APPROVED",
        isAllowed: true,
        ageOnCutoff: age,
        seasonYear,
        reason: `Player age ${age} exceeds U${effectiveCap} cap, but has approved DCF dispensation.`,
        warning: `Approved overage dispensation for U${effectiveCap} squad.`,
      };
    }

    return {
      status: "OVERAGE_BLOCKED",
      isAllowed: false,
      ageOnCutoff: age,
      seasonYear,
      reason: `Player is age ${age} on Jan 1, exceeding the U${effectiveCap} age boundary.`,
    };
  }

  // Under-age playing up in youth (e.g. age < effectiveCap - 2)
  if (age <= effectiveCap - 3) {
    return {
      status: "PLAYING_UP",
      isAllowed: true,
      ageOnCutoff: age,
      seasonYear,
      reason: `Player age ${age} is eligible and playing up in U${effectiveCap} squad.`,
      warning: `Player is playing up (eligible for younger youth category).`,
    };
  }

  return {
    status: "ELIGIBLE",
    isAllowed: true,
    ageOnCutoff: age,
    seasonYear,
    reason: `Player age ${age} is strictly eligible for U${effectiveCap} squad.`,
  };
}
