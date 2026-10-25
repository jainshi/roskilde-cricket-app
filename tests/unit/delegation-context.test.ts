import { describe, it, expect } from "vitest";
import { validateDelegationAccess } from "@/modules/auth-rbac/domain/delegation-rules";

describe("Delegated Action Context & Profile Authorization (FR-040, FR-041, FR-051)", () => {
  const parentActor = {
    profileId: "parent-1",
    roles: ["PARENT"],
    linkedChildIds: ["child-1", "child-2"],
  };

  const adminActor = {
    profileId: "admin-1",
    roles: ["ADMIN"],
    linkedChildIds: [],
  };

  const playerActor = {
    profileId: "player-1",
    roles: ["PLAYER"],
    linkedChildIds: [],
  };

  it("authorizes a member to access and edit their own profile (self)", () => {
    const res = validateDelegationAccess(playerActor, "player-1");
    expect(res.authorized).toBe(true);
    expect(res.isDelegated).toBe(false);
  });

  it("authorizes a parent to act on their linked child (delegated access)", () => {
    const resChild1 = validateDelegationAccess(parentActor, "child-1");
    expect(resChild1.authorized).toBe(true);
    expect(resChild1.isDelegated).toBe(true);

    const resChild2 = validateDelegationAccess(parentActor, "child-2");
    expect(resChild2.authorized).toBe(true);
    expect(resChild2.isDelegated).toBe(true);
  });

  it("rejects a parent attempting to act on an unlinked youth or other member", () => {
    const res = validateDelegationAccess(parentActor, "unlinked-child-3");
    expect(res.authorized).toBe(false);
    expect(res.reason).toContain("not authorized");
  });

  it("authorizes an Admin to manage any profile across the club", () => {
    const res1 = validateDelegationAccess(adminActor, "player-1");
    expect(res1.authorized).toBe(true);

    const res2 = validateDelegationAccess(adminActor, "child-1");
    expect(res2.authorized).toBe(true);
  });

  it("rejects a player attempting to access another player's private profile", () => {
    const res = validateDelegationAccess(playerActor, "other-player-2");
    expect(res.authorized).toBe(false);
  });
});
