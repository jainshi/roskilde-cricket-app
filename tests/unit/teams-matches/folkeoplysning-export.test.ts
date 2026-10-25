import { describe, it, expect } from "vitest";
import {
  calculateAgeAtDate,
  resolveAgeBracket,
  escapeCsvField,
  generateFolkeoplysningCsv,
  FolkeoplysningAttendanceRow,
} from "@/modules/teams-matches/domain/folkeoplysning-export";

describe("Danish Folkeoplysning Municipal Attendance CSV Generator", () => {
  describe("calculateAgeAtDate", () => {
    it("calculates age accurately on session date", () => {
      // Born 2012-06-15, Session on 2026-06-14 (1 day before birthday) -> age 13
      expect(calculateAgeAtDate("2012-06-15", "2026-06-14")).toBe(13);

      // Born 2012-06-15, Session on 2026-06-15 (on birthday) -> age 14
      expect(calculateAgeAtDate("2012-06-15", "2026-06-15")).toBe(14);
    });

    it("returns null on missing or invalid DOB", () => {
      expect(calculateAgeAtDate(null, "2026-06-14")).toBeNull();
      expect(calculateAgeAtDate("invalid", "2026-06-14")).toBeNull();
    });
  });

  describe("resolveAgeBracket", () => {
    it("categorizes into Danish municipal Folkeoplysning brackets", () => {
      expect(resolveAgeBracket(12)).toBe("UNDER_18");
      expect(resolveAgeBracket(17)).toBe("UNDER_18");
      expect(resolveAgeBracket(18)).toBe("18_TO_24");
      expect(resolveAgeBracket(24)).toBe("18_TO_24");
      expect(resolveAgeBracket(25)).toBe("25_AND_OVER");
      expect(resolveAgeBracket(45)).toBe("25_AND_OVER");
      expect(resolveAgeBracket(null)).toBe("UNKNOWN");
    });
  });

  describe("escapeCsvField", () => {
    it("escapes fields with commas, quotes, and newlines", () => {
      expect(escapeCsvField("Normal Text")).toBe("Normal Text");
      expect(escapeCsvField("Text, with comma")).toBe('"Text, with comma"');
      expect(escapeCsvField('Text with "quotes"')).toBe('"Text with ""quotes"""');
      expect(escapeCsvField(42)).toBe("42");
      expect(escapeCsvField(null)).toBe("");
    });
  });

  describe("generateFolkeoplysningCsv", () => {
    it("generates a valid CSV containing all members regardless of age", () => {
      const sampleRows: FolkeoplysningAttendanceRow[] = [
        {
          sessionDate: "2026-06-06T13:00:00Z",
          sessionType: "MATCH_LEAGUE",
          squadName: "Roskilde 1st XI",
          facilityName: "Poppelgårdsvej Main Pitch",
          memberId: "player-senior-1",
          memberName: "Henrik Mortensen",
          dateOfBirth: "1980-05-12",
          attendanceStatus: "PRESENT",
          arrivalTime: "2026-06-06T12:05:00Z",
          recordedByName: "Henrik Mortensen",
        },
        {
          sessionDate: "2026-06-06T09:30:00Z",
          sessionType: "MATCH_LEAGUE",
          squadName: "Roskilde U15 Youth",
          facilityName: "Poppelgårdsvej Main Pitch",
          memberId: "junior-oliver",
          memberName: "Oliver Jensen",
          dateOfBirth: "2012-11-05",
          attendanceStatus: "PRESENT",
          arrivalTime: "2026-06-06T09:15:00Z",
          recordedByName: "Lars Nielsen",
        },
        {
          sessionDate: "2026-06-06T09:30:00Z",
          sessionType: "MATCH_LEAGUE",
          squadName: "Roskilde U15 Youth",
          facilityName: "Poppelgårdsvej Main Pitch",
          memberId: "junior-lucas",
          memberName: "Lucas Hansen",
          dateOfBirth: "2014-04-10",
          attendanceStatus: "LATE",
          arrivalTime: "2026-06-06T09:45:00Z",
          recordedByName: "Lars Nielsen",
        },
      ];

      const csv = generateFolkeoplysningCsv(sampleRows);
      const lines = csv.split("\r\n");

      // Verify Header
      expect(lines[0]).toBe(
        "Session Date,Session Type,Squad Name,Facility / Ground,Member ID,Member Name,Date of Birth,Age At Session,Folkeoplysning Age Bracket,Attendance Status,Arrival Time,Recorded By"
      );

      // Verify Row 1: Adult Player (Age 46 -> 25_AND_OVER)
      expect(lines[1]).toContain("Henrik Mortensen");
      expect(lines[1]).toContain("25_AND_OVER");
      expect(lines[1]).toContain("PRESENT");

      // Verify Row 2: U15 Youth (Age 13 -> UNDER_18)
      expect(lines[2]).toContain("Oliver Jensen");
      expect(lines[2]).toContain("UNDER_18");
      expect(lines[2]).toContain("13");

      // Verify Row 3: LATE status preserved
      expect(lines[3]).toContain("Lucas Hansen");
      expect(lines[3]).toContain("LATE");
      expect(lines[3]).toContain("09:45");
    });
  });
});
