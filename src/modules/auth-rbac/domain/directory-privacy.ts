import { isMinor, calculateAge } from "./age-rules";
import type { Role, BattingPosition, BowlingStyle, SecondaryRole } from "@prisma/client";

export interface DirectoryViewerContext {
  viewerProfileId: string;
  viewerRoles: Role[] | string[];
  linkedChildIds: string[];
}

export interface RawMemberForDirectory {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  dateOfBirth: Date | null;
  battingPosition: BattingPosition | null;
  bowlingStyle: BowlingStyle | null;
  secondaryRoles: SecondaryRole[];
  isAnonymized: boolean;
  roleAssignments: { role: Role }[];
  privacySettings: {
    showEmailInDirectory: boolean;
    showPhoneInDirectory: boolean;
    showAddressInDirectory: boolean;
  } | null;
  // Sensitive fields that MUST NEVER be present in general directory:
  emergencyContacts?: unknown[];
  shirtSize?: unknown;
  trouserSize?: unknown;
  capSize?: unknown;
}

export interface SanitizedDirectoryMember {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roles: Role[];
  isMinor: boolean;
  ageCategory: "ADULT" | "YOUTH_13_17" | "YOUTH_UNDER_13";
  approximateAge: number | null;
  battingPosition: BattingPosition | null;
  bowlingStyle: BowlingStyle | null;
  secondaryRoles: SecondaryRole[];
  // Privacy-masked fields
  email: string | null;
  phone: string | null;
  city: string | null;
  // Metadata for viewer
  canViewFullDetails: boolean;
  hasEmergencyContact?: boolean;
}

export interface DirectoryFilters {
  searchQuery?: string;
  role?: string;
  battingPosition?: string;
  bowlingStyle?: string;
  ageCategory?: string;
}

/**
 * Pure domain logic: Checks if viewer has privileged staff access (Admin or Coach, FR-057).
 * Note: Ad-Hoc Coaches see general directory terms (FR-058).
 */
export function isPrivilegedStaff(viewerRoles: (Role | string)[]): boolean {
  return viewerRoles.includes("ADMIN") || viewerRoles.includes("COACH");
}

/**
 * Determines whether a viewer is authorized to see the contact details (email, phone, address)
 * of a given member in the directory (FR-054, FR-055, FR-056, FR-057, FR-058).
 */
export function canViewerSeeContact(
  target: RawMemberForDirectory,
  viewer: DirectoryViewerContext,
  now: Date = new Date()
): {
  canSeeEmail: boolean;
  canSeePhone: boolean;
  canSeeAddress: boolean;
  isPrivileged: boolean;
} {
  const isPrivileged = isPrivilegedStaff(viewer.viewerRoles);
  const isSelf = viewer.viewerProfileId === target.id;
  const isLinkedParent = viewer.linkedChildIds.includes(target.id);
  const targetIsMinor = isMinor(target.dateOfBirth, now);

  // 1. Privileged staff (Admin & Coach), Self, and Linked Parent can see full contacts (FR-057)
  if (isPrivileged || isSelf || isLinkedParent) {
    return {
      canSeeEmail: true,
      canSeePhone: true,
      canSeeAddress: true,
      isPrivileged: isPrivileged || isSelf || isLinkedParent,
    };
  }

  // 2. Minors: Contact details MUST NEVER be revealed to regular members in the directory (FR-056)
  if (targetIsMinor) {
    return {
      canSeeEmail: false,
      canSeePhone: false,
      canSeeAddress: false,
      isPrivileged: false,
    };
  }

  // 3. Adults: Each field is controlled by opt-in privacy toggles (FR-054, FR-055, default false)
  const privacy = target.privacySettings || {
    showEmailInDirectory: false,
    showPhoneInDirectory: false,
    showAddressInDirectory: false,
  };

  return {
    canSeeEmail: privacy.showEmailInDirectory === true,
    canSeePhone: privacy.showPhoneInDirectory === true,
    canSeeAddress: privacy.showAddressInDirectory === true,
    isPrivileged: false,
  };
}

/**
 * Sanitizes and masks a raw member record for directory display.
 * Strips date of birth, emergency contacts, and kit sizes unconditionally (FR-054).
 * Masks email, phone, address according to privacy visibility rules (FR-054, FR-059).
 */
export function sanitizeMemberForDirectory(
  member: RawMemberForDirectory,
  viewer: DirectoryViewerContext,
  now: Date = new Date()
): SanitizedDirectoryMember | null {
  // Exclude anonymized former members completely (FR-074)
  if (member.isAnonymized) {
    return null;
  }

  const minor = isMinor(member.dateOfBirth, now);
  const age = member.dateOfBirth ? calculateAge(member.dateOfBirth, now) : null;
  let ageCategory: "ADULT" | "YOUTH_13_17" | "YOUTH_UNDER_13" = "ADULT";
  if (minor) {
    ageCategory = age !== null && age < 13 ? "YOUTH_UNDER_13" : "YOUTH_13_17";
  }

  const { canSeeEmail, canSeePhone, canSeeAddress, isPrivileged } =
    canViewerSeeContact(member, viewer, now);

  const roles = member.roleAssignments.map((ra) => ra.role);

  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    fullName: `${member.firstName} ${member.lastName}`.trim(),
    roles,
    isMinor: minor,
    ageCategory,
    // Only privileged staff, self, or linked parent see exact age; others see general age category
    approximateAge: isPrivileged ? age : null,
    battingPosition: member.battingPosition,
    bowlingStyle: member.bowlingStyle,
    secondaryRoles: member.secondaryRoles || [],
    email: canSeeEmail ? member.email : null,
    phone: canSeePhone ? member.phone : null,
    city: canSeeAddress ? member.city : null,
    canViewFullDetails: isPrivileged,
  };
}

/**
 * Filters a list of sanitized members based on search query, role, batting, bowling, and age filters.
 */
export function filterDirectoryMembers(
  members: SanitizedDirectoryMember[],
  filters: DirectoryFilters
): SanitizedDirectoryMember[] {
  let result = members;

  // Search query (name search)
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.trim().toLowerCase();
    result = result.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q)
    );
  }

  // Role filter
  if (filters.role && filters.role !== "ALL") {
    result = result.filter((m) =>
      m.roles.includes(filters.role as Role)
    );
  }

  // Batting position filter
  if (filters.battingPosition && filters.battingPosition !== "ALL") {
    result = result.filter((m) => m.battingPosition === filters.battingPosition);
  }

  // Bowling style filter
  if (filters.bowlingStyle && filters.bowlingStyle !== "ALL") {
    result = result.filter((m) => m.bowlingStyle === filters.bowlingStyle);
  }

  // Age category filter
  if (filters.ageCategory && filters.ageCategory !== "ALL") {
    result = result.filter((m) => m.ageCategory === filters.ageCategory);
  }

  return result;
}
