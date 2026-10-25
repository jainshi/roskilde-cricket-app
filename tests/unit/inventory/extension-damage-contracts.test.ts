import { describe, it, expect } from "vitest";
import {
  requestLoanExtensionSchema,
  reviewLoanExtensionSchema,
} from "@/modules/inventory/contracts/extension.contract";
import {
  reportDamageSchema,
  resolveDamageReportSchema,
} from "@/modules/inventory/contracts/damage.contract";

describe("Extension & Damage Contracts Validation (T026)", () => {
  describe("requestLoanExtensionSchema", () => {
    it("accepts valid extension request with future date and detailed reason", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);

      const valid = {
        loanId: "loan-12345",
        proposedReturnAt: futureDate.toISOString(),
        reason: "Holding gear for the upcoming championship match next Saturday",
      };

      const result = requestLoanExtensionSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loanId).toBe("loan-12345");
        expect(result.data.proposedReturnAt).toBeInstanceOf(Date);
      }
    });

    it("rejects reason shorter than 5 characters", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invalid = {
        loanId: "loan-12345",
        proposedReturnAt: futureDate.toISOString(),
        reason: "Need",
      };

      const result = requestLoanExtensionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 5 characters");
      }
    });

    it("rejects empty loanId", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invalid = {
        loanId: "",
        proposedReturnAt: futureDate.toISOString(),
        reason: "Legitimate valid reason for loan extension",
      };

      const result = requestLoanExtensionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("reviewLoanExtensionSchema", () => {
    it("accepts APPROVED decision without rejection reason", () => {
      const valid = {
        extensionId: "ext-12345",
        decision: "APPROVED",
      };

      const result = reviewLoanExtensionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts REJECTED decision with rejection reason", () => {
      const valid = {
        extensionId: "ext-12345",
        decision: "REJECTED",
        rejectionReason: "Gear is needed for 1st XI match this weekend",
      };

      const result = reviewLoanExtensionSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.decision).toBe("REJECTED");
      }
    });

    it("rejects invalid decision", () => {
      const invalid = {
        extensionId: "ext-12345",
        decision: "MAYBE",
      };

      const result = reviewLoanExtensionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("reportDamageSchema", () => {
    it("accepts valid damage report across all severity tiers", () => {
      const severities = ["MINOR", "MAJOR", "BEYOND_REPAIR", "LOST"] as const;

      for (const sev of severities) {
        const valid = {
          equipmentItemId: "item-12345",
          loanId: "loan-54321",
          severity: sev,
          description: `Identified ${sev} damage during Saturday training session`,
        };

        const result = reportDamageSchema.safeParse(valid);
        expect(result.success).toBe(true);
      }
    });

    it("accepts report without loanId (general club asset damage)", () => {
      const valid = {
        equipmentItemId: "item-shed-key",
        severity: "LOST",
        description: "Facility key went missing from clubhouse board",
      };

      const result = reportDamageSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid severity code", () => {
      const invalid = {
        equipmentItemId: "item-12345",
        severity: "SLIGHTLY_DIRTY",
        description: "Just needs some water and a cloth",
      };

      const result = reportDamageSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("resolveDamageReportSchema", () => {
    it("accepts valid resolutions (REPAIRED, RETIRED_WRITTEN_OFF, DISMISSED)", () => {
      const resolutions = ["REPAIRED", "RETIRED_WRITTEN_OFF", "DISMISSED"] as const;

      for (const res of resolutions) {
        const valid = {
          reportId: "rep-98765",
          resolution: res,
          resolutionNotes: `Resolution note: ${res} processed by equipment manager`,
        };

        const result = resolveDamageReportSchema.safeParse(valid);
        expect(result.success).toBe(true);
      }
    });

    it("rejects resolution notes shorter than 3 characters", () => {
      const invalid = {
        reportId: "rep-98765",
        resolution: "REPAIRED",
        resolutionNotes: "Ok",
      };

      const result = resolveDamageReportSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
