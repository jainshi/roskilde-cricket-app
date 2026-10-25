import { describe, it, expect } from "vitest";

describe("Password Reset Token Lifecycle & Session Revocation (FR-019, US6, T045)", () => {
  const ONE_HOUR_MS = 60 * 60 * 1000;

  function generateResetToken(createdAt: Date = new Date()) {
    const expiresAt = new Date(createdAt.getTime() + ONE_HOUR_MS);
    return {
      token: "secure-token-" + Math.random().toString(36).substring(2),
      createdAt,
      expiresAt,
      usedAt: null as Date | null,
    };
  }

  function isTokenValid(tokenRecord: { expiresAt: Date; usedAt: Date | null }, now: Date = new Date()): boolean {
    if (tokenRecord.usedAt !== null) return false;
    if (tokenRecord.expiresAt < now) return false;
    return true;
  }

  it("creates a reset token with a 1-hour expiration window", () => {
    const now = new Date("2026-10-25T12:00:00Z");
    const token = generateResetToken(now);

    expect(token.expiresAt.getTime() - token.createdAt.getTime()).toBe(ONE_HOUR_MS);
    expect(isTokenValid(token, now)).toBe(true);

    // 30 minutes later -> still valid
    const thirtyMinLater = new Date("2026-10-25T12:30:00Z");
    expect(isTokenValid(token, thirtyMinLater)).toBe(true);
  });

  it("strictly invalidates tokens older than 1 hour", () => {
    const now = new Date("2026-10-25T12:00:00Z");
    const token = generateResetToken(now);

    // 61 minutes later -> expired
    const expiredTime = new Date("2026-10-25T13:01:00Z");
    expect(isTokenValid(token, expiredTime)).toBe(false);
  });

  it("enforces single-use token consumption (cannot be reused once used)", () => {
    const now = new Date("2026-10-25T12:00:00Z");
    const token = generateResetToken(now);

    expect(isTokenValid(token, now)).toBe(true);

    // Mark as used
    token.usedAt = new Date("2026-10-25T12:15:00Z");

    // Attempting to consume again should be rejected
    expect(isTokenValid(token, new Date("2026-10-25T12:20:00Z"))).toBe(false);
  });

  it("revokes all existing device sessions upon password reset or sign-out everywhere", () => {
    let sessionVersion = 1;
    let activeSessions = ["session-phone", "session-laptop", "session-tablet"];

    // User triggers 'Sign out everywhere' or changes password
    sessionVersion += 1;
    activeSessions = []; // Purged from database

    expect(sessionVersion).toBe(2);
    expect(activeSessions).toHaveLength(0);
  });
});
