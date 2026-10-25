import { Role } from "@prisma/client";

/**
 * Functional permission keys defined in SRS Section 2 & Constitution Principle II.
 */
export type PermissionAction =
  | "USER_MANAGEMENT_ONBOARD"
  | "USER_MANAGEMENT_VIEW_MEMBERS"
  | "USER_MANAGEMENT_VIEW_DIRECTORY"
  | "ROLE_ASSIGNMENT"
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
  userId?: string;
  userProfileId: string;
  roles: Role[];
  targetProfileId?: string;
  linkedPlayerIds?: string[];
}

/**
 * Evaluates whether a single role grants permission for an action in a given context.
 */
function roleHasPermission(
  role: Role,
  action: PermissionAction,
  ctx: PermissionContext
): boolean {
  switch (role) {
    case Role.ADMIN:
      // Administrator has full access across all operations
      return true;

    case Role.COACH:
      switch (action) {
        case "USER_MANAGEMENT_VIEW_MEMBERS":
        case "USER_MANAGEMENT_VIEW_DIRECTORY":
        case "EQUIPMENT_CHECKOUT_APPROVE":
        case "EQUIPMENT_CHECKOUT_SELF":
        case "EQUIPMENT_CHECKOUT_LINKED_YOUTH":
        case "CREATE_OFFICIAL_FIXTURES":
        case "CREATE_AD_HOC_DRILLS":
        case "ATTENDANCE_CHECK_IN":
        case "RSVP_SELF":
        case "RSVP_LINKED_YOUTH":
        case "SQUAD_SELECTION_PUBLISH":
        case "MATCH_SCORING_ENTRY":
        case "NOTICEBOARD_BROADCAST":
          return true;
        default:
          return false;
      }

    case Role.AD_HOC_COACH:
      switch (action) {
        case "USER_MANAGEMENT_VIEW_MEMBERS":
        case "USER_MANAGEMENT_VIEW_DIRECTORY":
        case "CREATE_AD_HOC_DRILLS":
        case "ATTENDANCE_CHECK_IN":
        case "EQUIPMENT_CHECKOUT_SELF":
        case "RSVP_SELF":
        case "RSVP_LINKED_YOUTH":
          return true;
        default:
          return false;
      }

    case Role.PLAYER:
      switch (action) {
        case "USER_MANAGEMENT_VIEW_DIRECTORY":
          return true;
        case "EQUIPMENT_CHECKOUT_SELF":
        case "RSVP_SELF":
          // Scoped to self
          return !ctx.targetProfileId || ctx.targetProfileId === ctx.userProfileId;
        default:
          return false;
      }

    case Role.PARENT:
      switch (action) {
        case "USER_MANAGEMENT_VIEW_DIRECTORY":
          return true;
        case "EQUIPMENT_CHECKOUT_SELF":
        case "RSVP_SELF":
          return !ctx.targetProfileId || ctx.targetProfileId === ctx.userProfileId;
        case "EQUIPMENT_CHECKOUT_LINKED_YOUTH":
          if (!ctx.targetProfileId) return false;
          return (
            ctx.targetProfileId === ctx.userProfileId ||
            (ctx.linkedPlayerIds?.includes(ctx.targetProfileId) ?? false)
          );
        case "PARENT_CHILD_MANAGE_YOUTH_PROFILE":
        case "RSVP_LINKED_YOUTH":
          // Strictly scoped to linked children; parents CANNOT manage links (FR-031)
          if (!ctx.targetProfileId) return false;
          return ctx.linkedPlayerIds?.includes(ctx.targetProfileId) ?? false;
        default:
          return false;
      }

    default:
      return false;
  }
}

/**
 * Pure evaluation function.
 * Evaluates whether an actor with given compound roles can perform an action on a target.
 * (FR-002: Compound role union; FR-006: Central permission matrix; FR-007: Scoped checking)
 */
export function hasPermission(
  action: PermissionAction,
  ctx: PermissionContext
): boolean {
  if (!ctx.roles || ctx.roles.length === 0) {
    return false;
  }

  // Compound role union: If ANY held role grants the permission for this context, access is granted.
  return ctx.roles.some((role) => roleHasPermission(role, action, ctx));
}
