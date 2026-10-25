/**
 * Pure contact fallback resolution and dual-parent notification routing (FR-022, FR-023, FR-024).
 * Framework-agnostic: no Prisma or Next.js dependencies.
 */

export interface LinkedParentContact {
  parentId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

export interface MemberContactDetails {
  memberId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  isMinor: boolean;
  linkedParents?: LinkedParentContact[];
}

export interface ContactRecipient {
  recipientId: string;
  recipientName: string;
  email: string | null;
  phone: string | null;
  isFallback: boolean;
  relationship: "SELF" | "PARENT";
}

export interface ResolvedContactResult {
  memberId: string;
  memberName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  hasFallback: boolean;
  notificationRecipients: ContactRecipient[];
  allEmails: string[];
}

/**
 * Resolves contact information for a member, enforcing:
 * 1. Fallback to linked parents if player has no email/phone (FR-022).
 * 2. Simultaneous dual-parent delivery when 2 parents are linked (FR-023).
 * 3. Simultaneous delivery to both parents AND youth if youth has email (FR-024).
 */
export function resolveMemberContact(
  member: MemberContactDetails
): ResolvedContactResult {
  const memberName = `${member.firstName} ${member.lastName}`.trim();
  const linkedParents = member.linkedParents || [];
  const recipients: ContactRecipient[] = [];

  const hasOwnEmail = !!member.email && member.email.trim().length > 0;
  const hasOwnPhone = !!member.phone && member.phone.trim().length > 0;

  // 1. Add self if member has own contact information
  if (hasOwnEmail || hasOwnPhone) {
    recipients.push({
      recipientId: member.memberId,
      recipientName: memberName,
      email: member.email?.trim() || null,
      phone: member.phone?.trim() || null,
      isFallback: false,
      relationship: "SELF",
    });
  }

  // 2. Dual-parent routing for youth or fallback for players without contact
  const shouldRouteToParents = member.isMinor || (!hasOwnEmail && !hasOwnPhone);

  if (shouldRouteToParents && linkedParents.length > 0) {
    for (const parent of linkedParents) {
      const parentName = `${parent.firstName} ${parent.lastName}`.trim();
      const parentEmail = parent.email?.trim() || null;
      const parentPhone = parent.phone?.trim() || null;

      if (parentEmail || parentPhone) {
        recipients.push({
          recipientId: parent.parentId,
          recipientName: parentName,
          email: parentEmail,
          phone: parentPhone,
          isFallback: !hasOwnEmail && !hasOwnPhone,
          relationship: "PARENT",
        });
      }
    }
  }

  // Resolve single primary email/phone for UI directory display
  let primaryEmail = member.email || null;
  let primaryPhone = member.phone || null;
  let hasFallback = false;

  if (!primaryEmail && linkedParents.length > 0) {
    const parentWithEmail = linkedParents.find((p) => !!p.email);
    if (parentWithEmail) {
      primaryEmail = parentWithEmail.email || null;
      hasFallback = true;
    }
  }

  if (!primaryPhone && linkedParents.length > 0) {
    const parentWithPhone = linkedParents.find((p) => !!p.phone);
    if (parentWithPhone) {
      primaryPhone = parentWithPhone.phone || null;
      hasFallback = true;
    }
  }

  // Filter unique valid emails for delivery
  const emailSet = new Set<string>();
  for (const r of recipients) {
    if (r.email) {
      emailSet.add(r.email.toLowerCase());
    }
  }

  return {
    memberId: member.memberId,
    memberName,
    primaryEmail,
    primaryPhone,
    hasFallback,
    notificationRecipients: recipients,
    allEmails: Array.from(emailSet),
  };
}
