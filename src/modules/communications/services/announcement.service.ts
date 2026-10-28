import { prisma } from "@/lib/db";
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
  Role,
} from "@prisma/client";
import {
  CreateAnnouncementInput,
  PublishWeatherCancellationInput,
} from "../contracts/announcement.contract";
import {
  filterAnnouncementsForMember,
  sortAnnouncementsByPriority,
  resolveDualParentRecipients,
  evaluateWeatherCancellation,
  MemberAnnouncementContext,
  AnnouncementItem,
} from "../domain/announcement-dispatcher";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";

function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 50);
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  return base ? `${base}-${suffix}` : suffix;
}

export type AnnouncementWithDetails = Announcement & {
  authorProfile: {
    id: string;
    firstName: string;
    lastName: string;
  };
  targetSquad?: {
    id: string;
    name: string;
    category: string;
    ageGroupRule?: string | null;
  } | null;
  linkedEvent?: {
    id: string;
    title: string;
    date: Date;
    startAt: Date;
    endAt: Date;
    lifecycleStatus: string;
    venueName?: string | null;
  } | null;
  readReceipts?: { id: string; memberProfileId: string; readAt: Date }[];
  isRead?: boolean;
};

/**
 * Fetch announcements accessible to a member profile, ordered by priority & date.
 */
export async function getMemberAnnouncements(
  memberProfileId: string,
  options?: { limit?: number; unreadOnly?: boolean; category?: AnnouncementCategory }
): Promise<AnnouncementWithDetails[]> {
  // 1. Fetch member profile with squad roster memberships and linked children
  const member = await prisma.memberProfile.findUnique({
    where: { id: memberProfileId },
    include: {
      roleAssignments: { select: { role: true } },
      rosterMemberships: { select: { teamSquadId: true } },
      parentLinksAsParent: {
        include: {
          player: {
            include: {
              rosterMemberships: { select: { teamSquadId: true } },
            },
          },
        },
      },
    },
  });

  if (!member) {
    return [];
  }

  const rosteredSquadIds = member.rosterMemberships.map((r) => r.teamSquadId);
  const linkedChildSquadIds: string[] = [];
  for (const link of member.parentLinksAsParent) {
    for (const r of link.player.rosterMemberships) {
      if (!linkedChildSquadIds.includes(r.teamSquadId)) {
        linkedChildSquadIds.push(r.teamSquadId);
      }
    }
  }

  const memberContext: MemberAnnouncementContext = {
    profileId: member.id,
    roles: member.roleAssignments.map((ra) => ra.role),
    rosteredSquadIds,
    linkedChildSquadIds,
  };

  // 2. Fetch announcements from database
  const whereClause: any = {};
  if (options?.category) {
    whereClause.category = options.category;
  }

  const announcements = await prisma.announcement.findMany({
    where: whereClause,
    include: {
      authorProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      targetSquad: {
        select: {
          id: true,
          name: true,
          category: true,
          ageGroupRule: true,
        },
      },
      linkedEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          lifecycleStatus: true,
          venueName: true,
        },
      },
      readReceipts: {
        where: { memberProfileId },
        select: { id: true, memberProfileId: true, readAt: true },
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  // 3. Apply pure domain filtering
  const filtered = filterAnnouncementsForMember(
    announcements as unknown as AnnouncementItem[],
    memberContext
  );

  // 4. Sort by priority (Urgent weather alerts -> Pinned -> AGM -> Recent)
  const sorted = sortAnnouncementsByPriority(filtered);

  // Map back to AnnouncementWithDetails with isRead computed
  const announcementMap = new Map(announcements.map((a) => [a.id, a]));
  let result: AnnouncementWithDetails[] = sorted
    .map((item) => {
      const full = announcementMap.get(item.id)!;
      const isRead = full.readReceipts && full.readReceipts.length > 0;
      return {
        ...full,
        isRead,
      };
    })
    .filter((a) => (options?.unreadOnly ? !a.isRead : true));

  if (options?.limit && options.limit > 0) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Fetch a single announcement by ID with details and read status.
 */
export async function getAnnouncementById(
  id: string,
  memberProfileId?: string
): Promise<AnnouncementWithDetails | null> {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: {
      authorProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      targetSquad: {
        select: {
          id: true,
          name: true,
          category: true,
          ageGroupRule: true,
        },
      },
      linkedEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          lifecycleStatus: true,
          venueName: true,
        },
      },
      readReceipts: memberProfileId
        ? {
            where: { memberProfileId },
            select: { id: true, memberProfileId: true, readAt: true },
          }
        : undefined,
    },
  });

  if (!announcement) return null;

  return {
    ...announcement,
    isRead: announcement.readReceipts ? announcement.readReceipts.length > 0 : false,
  };
}

/**
 * Create a new announcement and dispatch email notices to target recipients.
 */
export async function createAnnouncement(
  authorProfileId: string,
  input: CreateAnnouncementInput
): Promise<AnnouncementWithDetails> {
  const slug = generateSlug(input.title);

  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      slug,
      content: input.content,
      category: input.category,
      priority: input.priority,
      audience: input.audience,
      targetSquadId: input.targetSquadId,
      targetRole: input.targetRole as Role | null,
      linkedEventId: input.linkedEventId,
      authorProfileId,
      isPinned: input.isPinned,
      expiresAt: input.expiresAt,
    },
    include: {
      authorProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      targetSquad: {
        select: {
          id: true,
          name: true,
          category: true,
          ageGroupRule: true,
        },
      },
      linkedEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          lifecycleStatus: true,
          venueName: true,
        },
      },
    },
  });

  // Background dispatch: Collect recipient email addresses
  try {
    const recipientEmails = new Set<string>();

    if (input.audience === AnnouncementAudience.ALL_MEMBERS) {
      const activeMembers = await prisma.memberProfile.findMany({
        where: { isAnonymized: false },
        select: {
          email: true,
          parentLinksAsPlayer: {
            include: { parent: { select: { email: true } } },
          },
        },
      });

      for (const m of activeMembers) {
        if (m.email) recipientEmails.add(m.email);
        for (const link of m.parentLinksAsPlayer) {
          if (link.parent.email) recipientEmails.add(link.parent.email);
        }
      }
    } else if (input.audience === AnnouncementAudience.SQUAD_SPECIFIC && input.targetSquadId) {
      const squad = await prisma.teamSquad.findUnique({
        where: { id: input.targetSquadId },
        include: {
          roster: {
            include: {
              memberProfile: {
                include: {
                  parentLinksAsPlayer: {
                    include: { parent: { select: { id: true, firstName: true, lastName: true, email: true } } },
                  },
                },
              },
            },
          },
          coachAssignments: {
            include: { coachProfile: { select: { email: true } } },
          },
        },
      });

      if (squad) {
        // Add coaches
        for (const ca of squad.coachAssignments) {
          if (ca.coachProfile.email) recipientEmails.add(ca.coachProfile.email);
        }

        // Add roster members and dual parents
        const youthPlayersForDispatch: Array<{
          id: string;
          name: string;
          parents: Array<{ id: string; name: string; email: string | null }>;
        }> = [];

        for (const rm of squad.roster) {
          const m = rm.memberProfile;
          if (m.email) recipientEmails.add(m.email);

          if (squad.category === "YOUTH" || m.parentLinksAsPlayer.length > 0) {
            youthPlayersForDispatch.push({
              id: m.id,
              name: `${m.firstName} ${m.lastName}`,
              parents: m.parentLinksAsPlayer.map((pl) => ({
                id: pl.parent.id,
                name: `${pl.parent.firstName} ${pl.parent.lastName}`,
                email: pl.parent.email,
              })),
            });
          }
        }

        const parentRecipients = resolveDualParentRecipients(youthPlayersForDispatch);
        for (const pr of parentRecipients) {
          recipientEmails.add(pr.parentEmail);
        }
      }
    } else if (input.audience === AnnouncementAudience.ROLE_SPECIFIC && input.targetRole) {
      const roleMembers = await prisma.memberProfile.findMany({
        where: {
          isAnonymized: false,
          roleAssignments: { some: { role: input.targetRole as Role } },
        },
        select: { email: true },
      });

      for (const m of roleMembers) {
        if (m.email) recipientEmails.add(m.email);
      }
    }

    if (recipientEmails.size > 0) {
      const emailList = Array.from(recipientEmails);
      const isUrgent = input.priority === AnnouncementPriority.URGENT_WEATHER_ALERT;
      const subject = isUrgent
        ? `⚠️ [Roskilde Cricket Club] ${input.title}`
        : `[Roskilde Cricket Club] ${input.title}`;

      const html = `
        <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${isUrgent ? "#dc2626" : "#0369a1"}; margin-bottom: 8px;">Roskilde Cricket Club</h2>
          <div style="background-color: ${isUrgent ? "#fef2f2" : "#f8fafc"}; border: 1px solid ${isUrgent ? "#fca5a5" : "#e2e8f0"}; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <span style="display: inline-block; padding: 2px 8px; font-size: 12px; font-weight: bold; border-radius: 4px; background: ${isUrgent ? "#ef4444" : "#0284c7"}; color: #fff; margin-bottom: 8px;">
              ${input.category} &bull; ${input.priority}
            </span>
            <h3 style="margin-top: 4px; margin-bottom: 12px; color: #1e293b;">${input.title}</h3>
            <p style="white-space: pre-wrap; line-height: 1.5; color: #334155;">${input.content}</p>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">
            Published by ${announcement.authorProfile.firstName} ${announcement.authorProfile.lastName} on ${new Date().toLocaleDateString("da-DK")}.
          </p>
        </div>
      `;

      await notificationService.sendEmail({
        to: emailList,
        subject,
        html,
        text: `${input.title}\n\n${input.content}`,
      });
    }
  } catch (err) {
    console.error("[createAnnouncement] Error dispatching email notifications:", err);
  }

  return {
    ...announcement,
    isRead: false,
  };
}

/**
 * Publish an emergency weather/pitch cancellation announcement and atomically cancel the linked event.
 */
export async function publishWeatherCancellation(
  authorProfileId: string,
  input: PublishWeatherCancellationInput
): Promise<{ announcement: AnnouncementWithDetails; eventCancelled: boolean }> {
  // 1. Fetch the scheduled event with squad and attendees
  const event = await prisma.scheduledEvent.findUnique({
    where: { id: input.linkedEventId },
    include: {
      teamSquad: true,
      rsvps: {
        include: {
          memberProfile: {
            include: {
              parentLinksAsPlayer: {
                include: { parent: { select: { id: true, firstName: true, lastName: true, email: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!event) {
    throw new Error("Linked event fixture not found.");
  }

  const isYouth =
    event.teamSquad.category === "YOUTH" ||
    ["U11", "U13", "U15", "U17"].includes(event.teamSquad.ageGroupRule || "");

  // 2. Validate using pure domain logic
  const evaluation = evaluateWeatherCancellation({
    id: event.id,
    date: event.startAt,
    lifecycleStatus: event.lifecycleStatus,
    isYouthEvent: isYouth,
  });

  if (!evaluation.canCancel) {
    throw new Error(evaluation.error || "Cannot cancel this event due to weather.");
  }

  const slug = generateSlug(
    `weather-cancellation-${event.id.slice(0, 8)}-${Date.now()}`
  );

  // 3. Atomically cancel event & create emergency announcement
  const [updatedEvent, announcement] = await prisma.$transaction([
    prisma.scheduledEvent.update({
      where: { id: event.id },
      data: { lifecycleStatus: "CANCELLED" },
    }),
    prisma.announcement.create({
      data: {
        title: input.title,
        slug,
        content: input.content,
        category: AnnouncementCategory.WEATHER_ALERT,
        priority: AnnouncementPriority.URGENT_WEATHER_ALERT,
        audience: AnnouncementAudience.SQUAD_SPECIFIC,
        targetSquadId: event.teamSquadId,
        linkedEventId: event.id,
        authorProfileId,
        isPinned: true,
      },
      include: {
        authorProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        targetSquad: {
          select: {
            id: true,
            name: true,
            category: true,
            ageGroupRule: true,
          },
        },
        linkedEvent: {
          select: {
            id: true,
            title: true,
            date: true,
            startAt: true,
            endAt: true,
            lifecycleStatus: true,
            venueName: true,
          },
        },
      },
    }),
  ]);

  // 4. Dispatch urgent notifications to attendees and dual parents
  try {
    const recipientEmails = new Set<string>();
    const youthPlayersForDispatch: Array<{
      id: string;
      name: string;
      parents: Array<{ id: string; name: string; email: string | null }>;
    }> = [];

    for (const rsvp of event.rsvps) {
      const m = rsvp.memberProfile;
      if (m.email) recipientEmails.add(m.email);

      if (isYouth || m.parentLinksAsPlayer.length > 0) {
        youthPlayersForDispatch.push({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          parents: m.parentLinksAsPlayer.map((pl) => ({
            id: pl.parent.id,
            name: `${pl.parent.firstName} ${pl.parent.lastName}`,
            email: pl.parent.email,
          })),
        });
      }
    }

    if (input.notifyParents && youthPlayersForDispatch.length > 0) {
      const parentRecipients = resolveDualParentRecipients(youthPlayersForDispatch);
      for (const pr of parentRecipients) {
        recipientEmails.add(pr.parentEmail);
      }
    }

    if (recipientEmails.size > 0) {
      const emailList = Array.from(recipientEmails);
      const subject = `⚠️ URGENT CANCELLATION: ${event.title} - Pitch / Weather Alert`;
      const html = `
        <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626; margin-bottom: 4px;">⚠️ Fixture Cancelled - Weather Alert</h2>
          <h3 style="margin-top: 0; color: #1e293b;">${event.title}</h3>
          
          <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin-top: 0; font-weight: bold; color: #991b1b;">
              The match/practice scheduled for ${new Date(event.startAt).toLocaleString("da-DK")} has been CANCELLED due to unplayable weather/pitch conditions.
            </p>
            <p style="margin-bottom: 0; color: #7f1d1d; white-space: pre-wrap;">${input.content}</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Venue: ${event.venueName || "Roskilde Cricket Ground"}<br />
            Squad: ${event.teamSquad.name}
          </p>
        </div>
      `;

      await notificationService.sendEmail({
        to: emailList,
        subject,
        html,
        text: `URGENT CANCELLATION: ${event.title} on ${event.startAt}. Reason: ${input.content}`,
      });
    }
  } catch (err) {
    console.error("[publishWeatherCancellation] Error dispatching email notifications:", err);
  }

  return {
    announcement: {
      ...announcement,
      isRead: false,
    },
    eventCancelled: updatedEvent.lifecycleStatus === "CANCELLED",
  };
}

/**
 * Record a read receipt when a member views an announcement.
 */
export async function markAnnouncementAsRead(
  announcementId: string,
  memberProfileId: string
): Promise<{ readAt: Date }> {
  const receipt = await prisma.announcementReadReceipt.upsert({
    where: {
      announcementId_memberProfileId: {
        announcementId,
        memberProfileId,
      },
    },
    create: {
      announcementId,
      memberProfileId,
    },
    update: {
      readAt: new Date(),
    },
  });

  return { readAt: receipt.readAt };
}

/**
 * Delete an announcement. Allowed for original author or ADMIN role.
 */
export async function deleteAnnouncement(
  announcementId: string,
  requesterProfileId: string,
  requesterRoles: Role[]
): Promise<{ success: boolean }> {
  const existing = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });

  if (!existing) {
    throw new Error("Announcement not found");
  }

  const isAdmin = requesterRoles.includes("ADMIN");
  const isAuthor = existing.authorProfileId === requesterProfileId;

  if (!isAdmin && !isAuthor) {
    throw new Error("You do not have permission to delete this announcement.");
  }

  await prisma.announcement.delete({
    where: { id: announcementId },
  });

  return { success: true };
}
