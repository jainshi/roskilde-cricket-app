import { prisma } from "@/lib/db";
import {
  SaveMatchLineupDraftInput,
  PublishMatchLineupInput,
} from "../contracts/selection.contract";
import {
  validateMatchLineup,
  SelectedPlayerInput,
} from "../domain/lineup-validator";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";

/**
 * Saves a draft match squad lineup without publishing or notifying parents.
 */
export async function saveMatchLineupDraft(
  input: SaveMatchLineupDraftInput,
  callerProfileId: string
) {
  const event = await prisma.scheduledEvent.findUnique({
    where: { id: input.scheduledEventId },
    select: { id: true, title: true, teamSquadId: true },
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Upsert MatchSelection header
    const selection = await tx.matchSelection.upsert({
      where: { scheduledEventId: input.scheduledEventId },
      create: {
        scheduledEventId: input.scheduledEventId,
        targetLineupSize: input.targetLineupSize,
        selectionStatus: "DRAFT",
        notes: input.notes ?? null,
      },
      update: {
        targetLineupSize: input.targetLineupSize,
        notes: input.notes ?? null,
      },
    });

    // 2. Delete existing players in this selection
    await tx.matchSelectionPlayer.deleteMany({
      where: { matchSelectionId: selection.id },
    });

    // 3. Insert draft players
    if (input.players.length > 0) {
      await tx.matchSelectionPlayer.createMany({
        data: input.players.map((p) => ({
          matchSelectionId: selection.id,
          memberProfileId: p.memberProfileId,
          selectionRole: p.selectionRole,
          tacticalRole: p.tacticalRole,
          battingOrderPosition: p.battingOrderPosition ?? null,
        })),
      });
    }

    return selection;
  });
}

/**
 * Validates and publishes the match squad lineup.
 * Enforces lineup invariants and dispatches dual-parent alerts for minor players.
 */
export async function publishMatchLineup(
  input: PublishMatchLineupInput,
  callerProfileId: string
) {
  // 1. Fetch Event and Squad
  const event = await prisma.scheduledEvent.findUnique({
    where: { id: input.scheduledEventId },
    include: {
      teamSquad: { select: { id: true, name: true } },
      facility: { select: { name: true } },
    },
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  // 2. Enforce Lineup Invariants via Pure Domain Module (T011)
  const domainPlayers: SelectedPlayerInput[] = input.players.map((p) => ({
    memberProfileId: p.memberProfileId,
    selectionRole: p.selectionRole,
    tacticalRole: p.tacticalRole,
    battingOrderPosition: p.battingOrderPosition ?? undefined,
  }));

  const validation = validateMatchLineup({
    targetLineupSize: input.targetLineupSize,
    players: domainPlayers,
  });

  if (!validation.isValid) {
    throw new Error(`Lineup validation failed: ${validation.errors.join("; ")}`);
  }

  // 3. Save as PUBLISHED in Database Transaction
  const publishedSelection = await prisma.$transaction(async (tx) => {
    const selection = await tx.matchSelection.upsert({
      where: { scheduledEventId: input.scheduledEventId },
      create: {
        scheduledEventId: input.scheduledEventId,
        targetLineupSize: input.targetLineupSize,
        selectionStatus: "PUBLISHED",
        publishedAt: new Date(),
        publishedById: callerProfileId,
        notes: input.notes ?? null,
      },
      update: {
        targetLineupSize: input.targetLineupSize,
        selectionStatus: "PUBLISHED",
        publishedAt: new Date(),
        publishedById: callerProfileId,
        notes: input.notes ?? null,
      },
    });

    await tx.matchSelectionPlayer.deleteMany({
      where: { matchSelectionId: selection.id },
    });

    await tx.matchSelectionPlayer.createMany({
      data: input.players.map((p) => ({
        matchSelectionId: selection.id,
        memberProfileId: p.memberProfileId,
        selectionRole: p.selectionRole,
        tacticalRole: p.tacticalRole,
        battingOrderPosition: p.battingOrderPosition ?? null,
      })),
    });

    return selection;
  });

  // 4. Simultaneous Dual-Parent Notifications (FR-027, User Story 3)
  const selectedProfileIds = input.players.map((p) => p.memberProfileId);

  const selectedMembers = await prisma.memberProfile.findMany({
    where: { id: { in: selectedProfileIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      dateOfBirth: true,
      parentLinksAsPlayer: {
        include: {
          parent: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  let notifiedPlayerCount = 0;
  const matchDateFormatted = new Date(event.startAt).toLocaleDateString("en-DK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const matchTimeFormatted = new Date(event.startAt).toLocaleTimeString("en-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const venueDesc = event.facility?.name || event.venueName || "Home Ground";

  for (const member of selectedMembers) {
    const playerSelection = input.players.find(
      (p) => p.memberProfileId === member.id
    );
    const roleTag =
      playerSelection?.tacticalRole !== "PLAYER"
        ? ` (${playerSelection?.tacticalRole})`
        : "";

    // If player has linked parents, dispatch simultaneous alerts to both parents
    if (member.parentLinksAsPlayer.length > 0) {
      for (const link of member.parentLinksAsPlayer) {
        if (link.parent.email) {
          await notificationService.sendEmail({
            to: link.parent.email,
            subject: `Match Selection Alert: ${member.firstName} has been selected!`,
            html: `
              <h2>Roskilde Cricket Club - Match Selection Announcement</h2>
              <p>Dear ${link.parent.firstName},</p>
              <p>Your child <strong>${member.firstName} ${member.lastName}</strong> has been selected in the match squad for:</p>
              <div style="background:#f1f5f9;padding:12px;border-radius:8px;margin:12px 0;">
                <p><strong>Match:</strong> ${event.title}</p>
                <p><strong>Squad:</strong> ${event.teamSquad.name}</p>
                <p><strong>Date & Time:</strong> ${matchDateFormatted} at ${matchTimeFormatted}</p>
                <p><strong>Venue:</strong> ${venueDesc}</p>
                <p><strong>Role:</strong> ${playerSelection?.selectionRole}${roleTag}</p>
              </div>
              <p>Please check the RCC app for meet times, equipment instructions, and pitch directions.</p>
            `,
          });
          notifiedPlayerCount++;
        }
      }
    } else if (member.email) {
      // Adult member notification
      await notificationService.sendEmail({
        to: member.email,
        subject: `You've been selected for ${event.title}!`,
        html: `
          <h2>Match Selection: ${event.teamSquad.name}</h2>
          <p>Hi ${member.firstName},</p>
          <p>You have been selected in the starting lineup/squad for <strong>${event.title}</strong> on ${matchDateFormatted} at ${matchTimeFormatted}.</p>
          <p>Venue: ${venueDesc}</p>
          <p>Selected Role: ${playerSelection?.selectionRole}${roleTag}</p>
        `,
      });
      notifiedPlayerCount++;
    }
  }

  return {
    success: true,
    selectionId: publishedSelection.id,
    notifiedPlayerCount,
  };
}

/**
 * Retrieves the current match selection for an event.
 */
export async function getMatchSelection(scheduledEventId: string) {
  return await prisma.matchSelection.findUnique({
    where: { scheduledEventId },
    include: {
      publishedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      selectedPlayers: {
        include: {
          memberProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              battingPosition: true,
              bowlingStyle: true,
            },
          },
        },
        orderBy: [{ selectionRole: "asc" }, { battingOrderPosition: "asc" }],
      },
    },
  });
}
