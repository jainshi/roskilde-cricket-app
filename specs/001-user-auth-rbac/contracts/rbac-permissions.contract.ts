import { Role } from "@prisma/client";

/**
 * Functional permission keys defined in SRS Section 2 & Constitution Principle II.
 */
export type PermissionAction =
  | "USER_MANAGEMENT_ONBOARD"
  | "USER_MANAGEMENT_VIEW_MEMBERS"
  | "USER_MANAGEMENT_VIEW_DIRECTORY"
  | "PARENT_CHILD_MANAGE_LINKS"
  | "PARENT_CHILD_MANAGE_YOUTH_PROFILE"
  | "INVENTORY_CATALOG_EDIT"
  | "EQUIPMENT_CHECKOUT_APPROVE"
  | "EQUIPMENT_CHECKOUT_SELF"
  | "EQUIPMENT_CHECKOUT_LINKED_YOUTH"
  | "CREATE_OFFICIAL_FIXTURES"
  | "CREATE_AD_HOC_DRILLS"
  | "RSVP_SELF"
  | "RSVP_LINKED_YOUTH"
  | "ATTENDANCE_CHECK_IN"
  | "SQUAD_SELECTION_PUBLISH"
  | "MATCH_SCORING_ENTRY"
  | "NOTICEBOARD_BROADCAST";

export interface PermissionContext {
  userId: string;
  userProfileId: string;
  roles: Role[];
  targetProfileId?: string;
  linkedPlayerIds?: string[];
}

/**
 * Pure evaluation function.
 * Evaluates whether an actor with given compound roles can perform an action on a target.
 */
export function hasPermission(
  action: PermissionAction,
  ctx: PermissionContext
): boolean;
