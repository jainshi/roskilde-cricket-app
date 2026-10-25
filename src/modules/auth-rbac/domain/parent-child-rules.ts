/**
 * Pure domain rules for Parent-Child relationships and limits (FR-004, FR-012, FR-030).
 */

export const MAX_PARENTS_PER_YOUTH = 2;

export interface ExistingLink {
  id?: string;
  parentId: string;
  slot: number;
}

export type LinkValidationErrorCode =
  | "CANNOT_LINK_SELF"
  | "INVALID_SLOT"
  | "MAX_PARENTS_EXCEEDED"
  | "PARENT_ALREADY_LINKED"
  | "SLOT_OCCUPIED"
  | "ADULT_CANNOT_HAVE_PARENT"
  | "MINOR_CANNOT_BE_PARENT";

export interface ValidateLinkResult {
  valid: boolean;
  errorCode?: LinkValidationErrorCode;
  errorMessage?: string;
}

/**
 * Validates adding or updating a parent-child link.
 * Enforces:
 * 1. Player cannot be their own parent.
 * 2. Child MUST be a minor (<18). Adults manage their own profiles and credentials.
 * 3. Parent MUST be an adult (>=18). Minors cannot be linked as parents or hold the Parent role.
 * 4. Slot must be either 1 or 2.
 * 5. Total parents cannot exceed 2.
 * 6. Same parent cannot be linked twice to the same player.
 * 7. Slot cannot already be occupied by another parent (unless updating existing link).
 */
export function validateParentChildLink(params: {
  playerId: string;
  parentId: string;
  slot: number;
  existingLinks: ExistingLink[];
  updatingLinkId?: string;
  childIsMinor?: boolean;
  parentIsMinor?: boolean;
}): ValidateLinkResult {
  const {
    playerId,
    parentId,
    slot,
    existingLinks,
    updatingLinkId,
    childIsMinor,
    parentIsMinor,
  } = params;

  // 1. Cannot link player to themselves
  if (playerId === parentId) {
    return {
      valid: false,
      errorCode: "CANNOT_LINK_SELF",
      errorMessage: "A member cannot be linked as their own parent.",
    };
  }

  // 2. Child MUST be a minor (<18)
  if (childIsMinor !== undefined && !childIsMinor) {
    return {
      valid: false,
      errorCode: "ADULT_CANNOT_HAVE_PARENT",
      errorMessage:
        "Adult members cannot have parent or guardian links (FR-030). Only youth players under 18 may be linked to parents.",
    };
  }

  // 3. Parent MUST be an adult (>=18)
  if (parentIsMinor !== undefined && parentIsMinor) {
    return {
      valid: false,
      errorCode: "MINOR_CANNOT_BE_PARENT",
      errorMessage:
        "Minors under 18 cannot be linked as parents (FR-004, FR-030). Parents must be adult members.",
    };
  }

  // 4. Slot must be 1 or 2
  if (slot < 1 || slot > MAX_PARENTS_PER_YOUTH) {
    return {
      valid: false,
      errorCode: "INVALID_SLOT",
      errorMessage: `Parent slot must be 1 or 2 (maximum ${MAX_PARENTS_PER_YOUTH} parents per youth player).`,
    };
  }

  const otherLinks = updatingLinkId
    ? existingLinks.filter((l) => l.id !== updatingLinkId)
    : existingLinks;

  // 5. Max parents limit (2 parents cap)
  if (otherLinks.length >= MAX_PARENTS_PER_YOUTH) {
    return {
      valid: false,
      errorCode: "MAX_PARENTS_EXCEEDED",
      errorMessage: `Cannot link more than ${MAX_PARENTS_PER_YOUTH} parents to a youth player.`,
    };
  }

  // 6. Check for duplicate parent
  const alreadyLinked = otherLinks.some((l) => l.parentId === parentId);
  if (alreadyLinked) {
    return {
      valid: false,
      errorCode: "PARENT_ALREADY_LINKED",
      errorMessage: "This parent is already linked to the player.",
    };
  }

  // 7. Check if target slot is already occupied
  const slotOccupied = otherLinks.some((l) => l.slot === slot);
  if (slotOccupied) {
    return {
      valid: false,
      errorCode: "SLOT_OCCUPIED",
      errorMessage: `Slot ${slot} is already occupied by another parent.`,
    };
  }

  return { valid: true };
}
