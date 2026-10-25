/**
 * Domain module: Match Squad Lineup Validator
 * Implements Clarification #1:
 * - Lineup sizing is configurable per match type: defaults to 11 for Senior League, customizable 8-12 for Youth & Friendlies.
 * - Enforces role invariants: exactly 1 Captain, at most 1 Vice-Captain, exactly 1 Wicketkeeper among starters.
 * - Guards against duplicate player assignments and enforces unique batting orders.
 * - Allows partial lineups in DRAFT state; validates strictly on PUBLISHED state.
 */

export type LineupSlotType = "STARTING" | "SUBSTITUTE" | "RESERVE";
export type TacticalRoleType = "PLAYER" | "CAPTAIN" | "VICE_CAPTAIN" | "WICKETKEEPER";

export interface SelectedPlayerInput {
  memberProfileId: string;
  selectionRole: LineupSlotType;
  tacticalRole: TacticalRoleType;
  battingOrderPosition?: number | null;
}

export interface LineupValidationParams {
  players: SelectedPlayerInput[];
  targetLineupSize?: number; // Defaults to 11 if omitted
  isPublishing?: boolean; // If true, applies strict publication invariants
}

export interface LineupValidationResult {
  isValid: boolean;
  errors: string[];
  startingCount: number;
  substituteCount: number;
  reserveCount: number;
  captainProfileId?: string;
  viceCaptainProfileId?: string;
  wicketkeeperProfileId?: string;
}

/**
 * Validates a match squad lineup against configurable sizing and tactical role rules.
 */
export function validateMatchLineup({
  players,
  targetLineupSize = 11,
  isPublishing = false,
}: LineupValidationParams): LineupValidationResult {
  const errors: string[] = [];

  // 1. Check for Duplicate Players
  const seenMemberIds = new Set<string>();
  for (const p of players) {
    if (seenMemberIds.has(p.memberProfileId)) {
      errors.push(`Duplicate player assignment: Member "${p.memberProfileId}" is assigned multiple times.`);
    }
    seenMemberIds.add(p.memberProfileId);
  }

  // 2. Count by Selection Role
  const starters = players.filter((p) => p.selectionRole === "STARTING");
  const substitutes = players.filter((p) => p.selectionRole === "SUBSTITUTE");
  const reserves = players.filter((p) => p.selectionRole === "RESERVE");

  let captainProfileId: string | undefined;
  let viceCaptainProfileId: string | undefined;
  let wicketkeeperProfileId: string | undefined;

  let captainCount = 0;
  let viceCaptainCount = 0;
  let wicketkeeperCount = 0;

  // Check roles among starters
  for (const starter of starters) {
    if (starter.tacticalRole === "CAPTAIN") {
      captainCount++;
      captainProfileId = starter.memberProfileId;
    } else if (starter.tacticalRole === "VICE_CAPTAIN") {
      viceCaptainCount++;
      viceCaptainProfileId = starter.memberProfileId;
    } else if (starter.tacticalRole === "WICKETKEEPER") {
      wicketkeeperCount++;
      wicketkeeperProfileId = starter.memberProfileId;
    }
  }

  // Check roles among non-starters (substitutes/reserves cannot be Captain or Wicketkeeper)
  for (const nonStarter of [...substitutes, ...reserves]) {
    if (nonStarter.tacticalRole === "CAPTAIN") {
      errors.push("Non-starting substitute or reserve cannot be assigned as Captain.");
    }
    if (nonStarter.tacticalRole === "WICKETKEEPER") {
      errors.push("Non-starting substitute or reserve cannot be assigned as primary Wicketkeeper.");
    }
  }

  // 3. Batting Order Uniqueness among starters
  const seenBattingPositions = new Set<number>();
  for (const starter of starters) {
    if (starter.battingOrderPosition !== null && starter.battingOrderPosition !== undefined) {
      if (starter.battingOrderPosition < 1 || starter.battingOrderPosition > targetLineupSize) {
        errors.push(
          `Invalid batting position: #${starter.battingOrderPosition} must be between 1 and ${targetLineupSize}.`
        );
      }
      if (seenBattingPositions.has(starter.battingOrderPosition)) {
        errors.push(`Duplicate batting position: Position #${starter.battingOrderPosition} is assigned multiple times.`);
      }
      seenBattingPositions.add(starter.battingOrderPosition);
    }
  }

  // 4. Strict Publication Invariants
  if (isPublishing) {
    if (starters.length !== targetLineupSize) {
      errors.push(
        `Starting lineup requires exactly ${targetLineupSize} players for this match (currently ${starters.length} selected).`
      );
    }

    if (captainCount !== 1) {
      errors.push(`Starting lineup must have exactly 1 Captain (currently ${captainCount} assigned).`);
    }

    if (viceCaptainCount > 1) {
      errors.push(`Starting lineup can have at most 1 Vice-Captain (currently ${viceCaptainCount} assigned).`);
    }

    if (wicketkeeperCount !== 1) {
      errors.push(`Starting lineup must have exactly 1 primary Wicketkeeper (currently ${wicketkeeperCount} assigned).`);
    }
  } else {
    // Draft warnings/checks
    if (starters.length > targetLineupSize) {
      errors.push(`Starting lineup cannot exceed ${targetLineupSize} players.`);
    }
    if (captainCount > 1) {
      errors.push("Lineup cannot have more than 1 Captain.");
    }
    if (viceCaptainCount > 1) {
      errors.push("Lineup cannot have more than 1 Vice-Captain.");
    }
    if (wicketkeeperCount > 1) {
      errors.push("Lineup cannot have more than 1 primary Wicketkeeper.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    startingCount: starters.length,
    substituteCount: substitutes.length,
    reserveCount: reserves.length,
    captainProfileId,
    viceCaptainProfileId,
    wicketkeeperProfileId,
  };
}
