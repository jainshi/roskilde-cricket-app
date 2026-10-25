import { describe, it, expect } from "vitest";
import {
  computeAnonymizedShell,
  verifyPiiPurged,
  AnonymizableMember,
} from "@/modules/auth-rbac/domain/anonymization-rules";

describe("GDPR Right to Erasure & Statistical Shell Anonymization (FR-074, FR-075)", () => {
  const activeMember: AnonymizableMember = {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    firstName: "Anders",
    lastName: "Lindegaard",
    email: "anders.lindegaard@example.dk",
    phone: "+4588776655",
    address: "Stændertorvet 1",
    city: "Roskilde",
    postalCode: "4000",
    dateOfBirth: new Date("1992-06-14T00:00:00Z"),
    isAnonymized: false,
  };

  it("converts personal member data into a sanitized anonymized shell", () => {
    const shell = computeAnonymizedShell(activeMember);

    expect(shell.id).toBe(activeMember.id); // Maintains immutable ID for match statistics
    expect(shell.firstName).toBe("Former");
    expect(shell.lastName).toBe("Member #F47AC1");
    expect(shell.isAnonymized).toBe(true);

    // All PII permanently purged
    expect(shell.email).toBeNull();
    expect(shell.phone).toBeNull();
    expect(shell.address).toBeNull();
    expect(shell.city).toBeNull();
    expect(shell.postalCode).toBeNull();
    expect(shell.dateOfBirth).toBeNull();
  });

  it("passes PII verification check only when all personal fields are scrubbed", () => {
    const shell = computeAnonymizedShell(activeMember);
    expect(verifyPiiPurged(shell)).toBe(true);

    // If any PII remains, verification fails
    const corruptedShell = { ...shell, email: "leaked@example.com" as any };
    expect(verifyPiiPurged(corruptedShell)).toBe(false);

    const corruptedPhone = { ...shell, phone: "+4512345678" as any };
    expect(verifyPiiPurged(corruptedPhone)).toBe(false);
  });

  it("allows custom reference tags for sequential audit referencing", () => {
    const shell = computeAnonymizedShell(activeMember, "1042");
    expect(shell.lastName).toBe("Member #1042");
    expect(verifyPiiPurged(shell)).toBe(true);
  });
});
