import { prisma } from "@/lib/db";
import { hashPassword, generateTemporaryPassword } from "@/lib/password";
import { notificationService } from "../notifications/notification.service";
import {
  validateOnboardingRules,
  OnboardingRuleViolation,
} from "../domain/onboarding-rules";
import { isMinor } from "../domain/age-rules";
import {
  computeTemporaryPasswordExpiry,
  TEMPORARY_PASSWORD_VALIDITY_DAYS,
} from "../domain/activation";
import { getDictionary, formatMessage } from "@/i18n/get-dictionary";
import type { Role } from "@prisma/client";
import type { ParentSlotInput } from "../contracts/schemas";

export type OnboardingErrorCode =
  | OnboardingRuleViolation
  | "EMAIL_IN_USE"
  | "PARENT_EMAIL_IN_USE"
  | "PARENT_1_REQUIRED"
  | "SAME_PARENT_SLOTS"
  | "SAVE_FAILED";

export interface CreateMemberProfileResult {
  ok: boolean;
  memberProfileId?: string;
  temporaryPassword?: string;
  invitationSent?: boolean;
  parentInvitationsSent?: number;
  errorCode?: OnboardingErrorCode;
}

export interface OnboardingMemberInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null; // "YYYY-MM-DD"
  roles: Role[];
  grantLoginAccess: boolean;
  parent1?: ParentSlotInput | null;
  parent2?: ParentSlotInput | null;
}

/**
 * Creates a member profile, role assignments, optional credentials,
 * handles inline parent creation / association for minors, and dispatches invitation emails.
 * Everything runs in a single atomic Prisma transaction.
 */
export async function createMemberProfile(
  input: OnboardingMemberInput,
  actorProfileId?: string
): Promise<CreateMemberProfileResult> {
  const parsedDob = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
  const cleanEmail = input.email ? input.email.trim().toLowerCase() : null;
  const isMinorPlayer = input.roles.includes("PLAYER") && isMinor(parsedDob);

  // 1. Cross-field business rules validation
  const violations = validateOnboardingRules({
    roles: input.roles,
    dateOfBirth: parsedDob,
    email: cleanEmail,
    grantLoginAccess: input.grantLoginAccess,
  });

  if (violations.length > 0) {
    return { ok: false, errorCode: violations[0] };
  }

  // 2. Validate Minor Player Parent Requirements (Slot 1 required for minors, max 2 total)
  if (isMinorPlayer) {
    if (!input.parent1) {
      return { ok: false, errorCode: "PARENT_1_REQUIRED" };
    }
    if (input.parent1.mode === "EXISTING" && !input.parent1.existingProfileId) {
      return { ok: false, errorCode: "PARENT_1_REQUIRED" };
    }
    if (input.parent1.mode === "NEW" && (!input.parent1.firstName || !input.parent1.lastName || !input.parent1.email)) {
      return { ok: false, errorCode: "PARENT_1_REQUIRED" };
    }

    // Prevent selecting identical existing parent in both slots
    if (
      input.parent1.mode === "EXISTING" &&
      input.parent2?.mode === "EXISTING" &&
      input.parent1.existingProfileId &&
      input.parent1.existingProfileId === input.parent2.existingProfileId
    ) {
      return { ok: false, errorCode: "SAME_PARENT_SLOTS" };
    }
  }

  // 3. Check for email uniqueness before starting transaction
  if (cleanEmail) {
    const existing = await prisma.memberProfile.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });
    if (existing) {
      return { ok: false, errorCode: "EMAIL_IN_USE" };
    }
  }

  // 4. Prepare credentials for member if requested
  let tempPassword = "";
  let passwordHash = "";
  let tempExpiry: Date | null = null;

  if (input.grantLoginAccess && cleanEmail) {
    tempPassword = generateTemporaryPassword(8);
    passwordHash = await hashPassword(tempPassword);
    tempExpiry = computeTemporaryPasswordExpiry();
  }

  // Collect any newly created parents that need invitation dispatch
  const pendingParentInvitations: {
    email: string;
    firstName: string;
    tempPassword: string;
  }[] = [];

  try {
    const result = await prisma.$transaction(async (tx) => {
      // A. Create Youth / Member Profile and RoleAssignments
      const profile = await tx.memberProfile.create({
        data: {
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: cleanEmail,
          phone: input.phone?.trim() || null,
          dateOfBirth: parsedDob,
          roleAssignments: {
            create: input.roles.map((role) => ({
              role,
              assignedById: actorProfileId || null,
            })),
          },
          privacySettings: {
            create: {
              showEmailInDirectory: false,
              showPhoneInDirectory: false,
              showAddressInDirectory: false,
            },
          },
        },
      });

      // Audit Log for member creation
      await tx.auditLog.create({
        data: {
          actorProfileId: actorProfileId || null,
          targetProfileId: profile.id,
          action: "MEMBER_PROFILE_CREATED",
          metadata: {
            roles: input.roles,
            grantLoginAccess: input.grantLoginAccess,
          },
        },
      });

      // B. Create UserAccount if credentials requested
      if (input.grantLoginAccess && cleanEmail && passwordHash) {
        await tx.userAccount.create({
          data: {
            memberProfileId: profile.id,
            email: cleanEmail,
            passwordHash,
            status: "INVITED",
            mustResetPassword: true,
            temporaryPasswordExpiresAt: tempExpiry,
          },
        });

        await tx.auditLog.create({
          data: {
            actorProfileId: actorProfileId || null,
            targetProfileId: profile.id,
            action: "LOGIN_ACCESS_GRANTED",
            metadata: {
              email: cleanEmail,
              expiresAt: tempExpiry?.toISOString(),
            },
          },
        });
      }

      // C. Process Parent Associations for Minor Player (Slot 1 and Slot 2)
      if (isMinorPlayer) {
        const slots: { slot: number; data: ParentSlotInput | null | undefined }[] = [
          { slot: 1, data: input.parent1 },
          { slot: 2, data: input.parent2 },
        ];

        for (const { slot, data } of slots) {
          if (!data) continue;

          let parentProfileId: string | null = null;

          if (data.mode === "EXISTING" && data.existingProfileId) {
            parentProfileId = data.existingProfileId;

            // Ensure the existing profile has the PARENT role
            const existingRole = await tx.roleAssignment.findUnique({
              where: {
                memberProfileId_role: {
                  memberProfileId: parentProfileId,
                  role: "PARENT",
                },
              },
            });

            if (!existingRole) {
              await tx.roleAssignment.create({
                data: {
                  memberProfileId: parentProfileId,
                  role: "PARENT",
                  assignedById: actorProfileId || null,
                },
              });
            }
          } else if (data.mode === "NEW" && data.email && data.firstName && data.lastName) {
            const cleanParentEmail = data.email.trim().toLowerCase();

            // Check if parent email already exists
            const existingParent = await tx.memberProfile.findUnique({
              where: { email: cleanParentEmail },
              select: { id: true },
            });

            if (existingParent) {
              parentProfileId = existingParent.id;
              // Ensure PARENT role exists
              const roleCheck = await tx.roleAssignment.findUnique({
                where: {
                  memberProfileId_role: {
                    memberProfileId: parentProfileId,
                    role: "PARENT",
                  },
                },
              });
              if (!roleCheck) {
                await tx.roleAssignment.create({
                  data: {
                    memberProfileId: parentProfileId,
                    role: "PARENT",
                    assignedById: actorProfileId || null,
                  },
                });
              }
            } else {
              // Create brand new Parent Profile + UserAccount with credentials
              const parentTempPassword = generateTemporaryPassword(8);
              const parentHash = await hashPassword(parentTempPassword);
              const parentTempExpiry = computeTemporaryPasswordExpiry();

              const newParent = await tx.memberProfile.create({
                data: {
                  firstName: data.firstName.trim(),
                  lastName: data.lastName.trim(),
                  email: cleanParentEmail,
                  phone: data.phone?.trim() || null,
                  roleAssignments: {
                    create: {
                      role: "PARENT",
                      assignedById: actorProfileId || null,
                    },
                  },
                  privacySettings: {
                    create: {
                      showEmailInDirectory: false,
                      showPhoneInDirectory: false,
                      showAddressInDirectory: false,
                    },
                  },
                  userAccount: {
                    create: {
                      email: cleanParentEmail,
                      passwordHash: parentHash,
                      status: "INVITED",
                      mustResetPassword: true,
                      temporaryPasswordExpiresAt: parentTempExpiry,
                    },
                  },
                },
              });

              parentProfileId = newParent.id;

              pendingParentInvitations.push({
                email: cleanParentEmail,
                firstName: data.firstName.trim(),
                tempPassword: parentTempPassword,
              });

              await tx.auditLog.create({
                data: {
                  actorProfileId: actorProfileId || null,
                  targetProfileId: newParent.id,
                  action: "MEMBER_PROFILE_CREATED",
                  metadata: {
                    roles: ["PARENT"],
                    createdInlineForYouth: profile.id,
                  },
                },
              });
            }
          }

          // Create the ParentChildLink
          if (parentProfileId) {
            await tx.parentChildLink.create({
              data: {
                playerId: profile.id,
                parentId: parentProfileId,
                slot,
                relationship: data.relationship || (slot === 1 ? "Guardian" : "Parent"),
              },
            });

            await tx.auditLog.create({
              data: {
                actorProfileId: actorProfileId || null,
                targetProfileId: profile.id,
                action: "PARENT_CHILD_LINKED",
                metadata: {
                  parentId: parentProfileId,
                  slot,
                  relationship: data.relationship || null,
                },
              },
            });
          }
        }
      }

      return profile;
    });

    // 5. Send invitation notifications outside the transaction
    const dict = getDictionary("en");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const sendInvite = async (recipientEmail: string, recipientName: string, pwd: string) => {
      const signInUrl = `${appUrl}/signin?email=${encodeURIComponent(recipientEmail)}`;
      const emailSubject = dict.emails.invitation.subject;
      const greeting = formatMessage(dict.emails.invitation.greeting, {
        firstName: recipientName,
      });
      const intro = dict.emails.invitation.intro;
      const instructions = formatMessage(dict.emails.invitation.instructions, {
        days: TEMPORARY_PASSWORD_VALIDITY_DAYS,
      });
      const fallback = formatMessage(dict.emails.invitation.urlFallback, { signInUrl });

      const textBody = `${greeting}\n\n${intro}\n\n${instructions}\n\n${dict.emails.invitation.tempPasswordLabel} ${pwd}\n\n${fallback}`;
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #0c2340; margin-top: 0;">${greeting}</h2>
          <p style="color: #374151; font-size: 16px;">${intro}</p>
          <p style="color: #374151; font-size: 15px;">${instructions}</p>
          <div style="background-color: #f0f9ff; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0; border: 1px solid #bae6fd;">
            <span style="font-size: 14px; color: #0369a1; display: block; margin-bottom: 4px;">${dict.emails.invitation.tempPasswordLabel}</span>
            <code style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #0c2340;">${pwd}</code>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${signInUrl}" style="background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">${dict.emails.invitation.signInButton}</a>
          </div>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">${fallback}</p>
        </div>
      `;

      await notificationService.sendEmail({
        to: recipientEmail,
        subject: emailSubject,
        html: htmlBody,
        text: textBody,
      });
    };

    let invitationSent = false;
    if (input.grantLoginAccess && cleanEmail && tempPassword) {
      try {
        await sendInvite(cleanEmail, input.firstName.trim(), tempPassword);
        invitationSent = true;
      } catch (err) {
        console.error("Failed to dispatch member invitation email:", err);
      }
    }

    let parentInvitesCount = 0;
    for (const parentInvite of pendingParentInvitations) {
      try {
        await sendInvite(parentInvite.email, parentInvite.firstName, parentInvite.tempPassword);
        parentInvitesCount++;
      } catch (err) {
        console.error(`Failed to dispatch parent invitation to ${parentInvite.email}:`, err);
      }
    }

    return {
      ok: true,
      memberProfileId: result.id,
      temporaryPassword: tempPassword || undefined,
      invitationSent,
      parentInvitationsSent: parentInvitesCount,
    };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { ok: false, errorCode: "EMAIL_IN_USE" };
    }
    console.error("Onboarding transaction error:", error);
    return { ok: false, errorCode: "SAVE_FAILED" };
  }
}

/**
 * Returns potential parents for dropdown selector (all members or members with PARENT/COACH/ADMIN roles).
 */
export async function getAvailableParents(): Promise<{ id: string; name: string; email: string | null }[]> {
  const members = await prisma.memberProfile.findMany({
    where: {
      isAnonymized: false,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      roleAssignments: {
        select: { role: true },
      },
    },
    orderBy: [
      { firstName: "asc" },
      { lastName: "asc" },
    ],
  });

  return members.map((m) => ({
    id: m.id,
    name: `${m.firstName} ${m.lastName}${m.roleAssignments.some((r) => r.role === "PARENT") ? " (Parent)" : ""}`,
    email: m.email,
  }));
}
