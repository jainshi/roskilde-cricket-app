import { describe, it, expect } from "vitest";
import {
  validateMatchLineup,
  SelectedPlayerInput,
} from "@/modules/teams-matches/domain/lineup-validator";

describe("Match Squad Lineup Validator", () => {
  // Helper to generate N player inputs
  function makePlayers(count: number, startIdx = 1): SelectedPlayerInput[] {
    return Array.from({ length: count }, (_, i) => ({
      memberProfileId: `player-${startIdx + i}`,
      selectionRole: "STARTING" as const,
      tacticalRole: (i === 0 ? "CAPTAIN" : i === 1 ? "WICKETKEEPER" : "PLAYER") as any,
      battingOrderPosition: i + 1,
    }));
  }

  describe("Publication Invariants - Senior League (11-a-side)", () => {
    it("validates a complete, correctly balanced 11-player lineup", () => {
      const players = makePlayers(11);
      // Add a Vice-Captain at slot 3
      players[2].tacticalRole = "VICE_CAPTAIN";

      const result = validateMatchLineup({
        players,
        targetLineupSize: 11,
        isPublishing: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.startingCount).toBe(11);
      expect(result.captainProfileId).toBe("player-1");
      expect(result.wicketkeeperProfileId).toBe("player-2");
      expect(result.viceCaptainProfileId).toBe("player-3");
    });

    it("rejects publication if fewer than 11 players selected for standard XI", () => {
      const players = makePlayers(10); // 1 player missing

      const result = validateMatchLineup({
        players,
        targetLineupSize: 11,
        isPublishing: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Starting lineup requires exactly 11 players for this match (currently 10 selected)."
      );
    });

    it("rejects publication if Captain is missing", () => {
      const players = makePlayers(11);
      players[0].tacticalRole = "PLAYER"; // Remove captain

      const result = validateMatchLineup({
        players,
        targetLineupSize: 11,
        isPublishing: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Starting lineup must have exactly 1 Captain (currently 0 assigned)."
      );
    });

    it("rejects publication if Wicketkeeper is missing", () => {
      const players = makePlayers(11);
      players[1].tacticalRole = "PLAYER"; // Remove keeper

      const result = validateMatchLineup({
        players,
        targetLineupSize: 11,
        isPublishing: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Starting lineup must have exactly 1 primary Wicketkeeper (currently 0 assigned)."
      );
    });

    it("rejects duplicate player assignments", () => {
      const players = makePlayers(11);
      players[5].memberProfileId = players[0].memberProfileId; // Duplicate!

      const result = validateMatchLineup({
        players,
        targetLineupSize: 11,
        isPublishing: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Duplicate player assignment");
    });
  });

  describe("Configurable Lineup Sizing - Youth & Friendlies (8-10 aside)", () => {
    it("validates an 8-a-side youth match selection when targetLineupSize is 8", () => {
      const players = makePlayers(8);

      const result = validateMatchLineup({
        players,
        targetLineupSize: 8,
        isPublishing: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.startingCount).toBe(8);
    });

    it("validates a 10-a-side U15 youth match selection when targetLineupSize is 10", () => {
      const players = makePlayers(10);

      const result = validateMatchLineup({
        players,
        targetLineupSize: 10,
        isPublishing: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.startingCount).toBe(10);
    });
  });

  describe("Substitutes and Reserves", () => {
    it("permits substitutes and reserves alongside starting lineup", () => {
      const starters = makePlayers(11);
      const subs: SelectedPlayerInput[] = [
        {
          memberProfileId: "sub-1",
          selectionRole: "SUBSTITUTE",
          tacticalRole: "PLAYER",
        },
        {
          memberProfileId: "res-1",
          selectionRole: "RESERVE",
          tacticalRole: "PLAYER",
        },
      ];

      const result = validateMatchLineup({
        players: [...starters, ...subs],
        targetLineupSize: 11,
        isPublishing: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.startingCount).toBe(11);
      expect(result.substituteCount).toBe(1);
      expect(result.reserveCount).toBe(1);
    });

    it("rejects assigning Captain or Wicketkeeper role to a substitute or reserve", () => {
      const starters = makePlayers(11);
      const invalidSub: SelectedPlayerInput = {
        memberProfileId: "sub-1",
        selectionRole: "SUBSTITUTE",
        tacticalRole: "CAPTAIN", // Forbidden on sub
      };

      const result = validateMatchLineup({
        players: [...starters, invalidSub],
        targetLineupSize: 11,
        isPublishing: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Non-starting substitute or reserve cannot be assigned as Captain."
      );
    });
  });

  describe("Draft Lineup Flexibility", () => {
    it("allows incomplete partial lineup in draft state without publication errors", () => {
      const players = makePlayers(5); // Only 5 players picked so far

      const result = validateMatchLineup({
        players,
        targetLineupSize: 11,
        isPublishing: false, // DRAFT mode
      });

      expect(result.isValid).toBe(true);
      expect(result.startingCount).toBe(5);
    });
  });
});
