import { prisma } from "@/lib/db";
import {
  VolunteerDutySlot,
  VolunteerDutyType,
  VolunteerSlotStatus,
  Role,
} from "@prisma/client";
import {
  CreateVolunteerDutySlotInput,
  AssignVolunteerDutySlotInput,
  ClaimVolunteerDutySlotInput,
  RequestVolunteerSwapInput,
  AcceptVolunteerSwapInput,
} from "../contracts/volunteer.contract";
import {
  validateDutyClaim,
  requestDutySwap,
  acceptDutySwap,
  calculateEventVolunteerFulfillment,
  EventVolunteerFulfillment,
  VolunteerSlotState,
} from "../domain/volunteer-roster";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";

export type VolunteerSlotWithDetails = VolunteerDutySlot & {
  scheduledEvent: {
    id: string;
    title: string;
    date: Date;
    startAt: Date;
    endAt: Date;
    venueName?: string | null;
    isHome: boolean;
    teamSquad: {
      id: string;
      name: string;
      category: string;
    };
  };
  assignedProfile?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  } | null;
};

/**
 * Fetch all volunteer duty slots for a specific event fixture with staffing fulfillment metrics.
 */
export async function getEventVolunteerSlots(eventId: string): Promise<{
  slots: VolunteerSlotWithDetails[];
  fulfillment: EventVolunteerFulfillment;
}> {
  const slots = await prisma.volunteerDutySlot.findMany({
    where: { eventId },
    include: {
      scheduledEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          venueName: true,
          isHome: true,
          teamSquad: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      assignedProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const slotStates: VolunteerSlotState[] = slots.map((s) => ({
    id: s.id,
    eventId: s.eventId,
    dutyType: s.dutyType,
    title: s.title,
    status: s.status,
    assignedProfileId: s.assignedProfileId,
    claimedAt: s.claimedAt,
    swapRequestedAt: s.swapRequestedAt,
    swapReason: s.swapReason,
    carpoolSeats: s.carpoolSeats,
  }));

  const fulfillment = calculateEventVolunteerFulfillment(slotStates);

  return {
    slots: slots as VolunteerSlotWithDetails[],
    fulfillment,
  };
}

/**
 * Fetch volunteer duties for a given member (and optionally linked children when parent profile is active).
 */
export async function getMyVolunteerDuties(
  profileId: string,
  includeLinkedChildren: boolean = true
): Promise<VolunteerSlotWithDetails[]> {
  const profileIds = [profileId];

  if (includeLinkedChildren) {
    const parentLinks = await prisma.parentChildLink.findMany({
      where: { parentId: profileId },
      select: { playerId: true },
    });
    for (const link of parentLinks) {
      if (!profileIds.includes(link.playerId)) {
        profileIds.push(link.playerId);
      }
    }
  }

  const slots = await prisma.volunteerDutySlot.findMany({
    where: {
      assignedProfileId: { in: profileIds },
    },
    include: {
      scheduledEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          venueName: true,
          isHome: true,
          teamSquad: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      assignedProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      scheduledEvent: {
        startAt: "asc",
      },
    },
  });

  return slots as VolunteerSlotWithDetails[];
}

/**
 * Fetch upcoming volunteer duty slots across the club for the dedicated volunteer roster hub.
 */
export async function getUpcomingVolunteerRoster(options?: {
  dutyType?: VolunteerDutyType;
  status?: VolunteerSlotStatus;
  fromDate?: Date;
  limit?: number;
}): Promise<{
  slots: VolunteerSlotWithDetails[];
  stats: {
    totalUpcoming: number;
    openDuties: number;
    claimedDuties: number;
    swapRequested: number;
  };
}> {
  const fromDate = options?.fromDate || new Date(Date.now() - 12 * 3600 * 1000); // include today
  const whereClause: any = {
    scheduledEvent: {
      startAt: { gte: fromDate },
      lifecycleStatus: { not: "CANCELLED" },
    },
  };

  if (options?.dutyType) {
    whereClause.dutyType = options.dutyType;
  }
  if (options?.status) {
    whereClause.status = options.status;
  }

  const [slots, totalUpcoming, openDuties, claimedDuties, swapRequested] = await Promise.all([
    prisma.volunteerDutySlot.findMany({
      where: whereClause,
      include: {
        scheduledEvent: {
          select: {
            id: true,
            title: true,
            date: true,
            startAt: true,
            endAt: true,
            venueName: true,
            isHome: true,
            teamSquad: {
              select: { id: true, name: true, category: true },
            },
          },
        },
        assignedProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        scheduledEvent: {
          startAt: "asc",
        },
      },
      take: options?.limit || 50,
    }),
    prisma.volunteerDutySlot.count({
      where: {
        scheduledEvent: { startAt: { gte: fromDate }, lifecycleStatus: { not: "CANCELLED" } },
      },
    }),
    prisma.volunteerDutySlot.count({
      where: {
        status: VolunteerSlotStatus.OPEN,
        scheduledEvent: { startAt: { gte: fromDate }, lifecycleStatus: { not: "CANCELLED" } },
      },
    }),
    prisma.volunteerDutySlot.count({
      where: {
        status: VolunteerSlotStatus.CLAIMED,
        scheduledEvent: { startAt: { gte: fromDate }, lifecycleStatus: { not: "CANCELLED" } },
      },
    }),
    prisma.volunteerDutySlot.count({
      where: {
        status: VolunteerSlotStatus.SWAP_REQUESTED,
        scheduledEvent: { startAt: { gte: fromDate }, lifecycleStatus: { not: "CANCELLED" } },
      },
    }),
  ]);

  return {
    slots: slots as VolunteerSlotWithDetails[],
    stats: {
      totalUpcoming,
      openDuties,
      claimedDuties,
      swapRequested,
    },
  };
}

/**
 * Create a new volunteer duty slot on an event fixture (Admins / Coaches).
 */
export async function createVolunteerDutySlot(
  input: CreateVolunteerDutySlotInput
): Promise<VolunteerSlotWithDetails> {
  const event = await prisma.scheduledEvent.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });

  if (!event) {
    throw new Error("Event fixture not found.");
  }

  const slot = await prisma.volunteerDutySlot.create({
    data: {
      eventId: input.eventId,
      dutyType: input.dutyType,
      title: input.title,
      description: input.description,
      carpoolSeats: input.carpoolSeats,
      assignedProfileId: input.assignedProfileId || null,
      status: input.assignedProfileId ? VolunteerSlotStatus.CLAIMED : VolunteerSlotStatus.OPEN,
      claimedAt: input.assignedProfileId ? new Date() : null,
      notes: input.notes,
    },
    include: {
      scheduledEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          venueName: true,
          isHome: true,
          teamSquad: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      assignedProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return slot as VolunteerSlotWithDetails;
}

/**
 * Assign a volunteer duty slot directly to a member (Admin / Coach).
 */
export async function assignVolunteerDutySlot(
  input: AssignVolunteerDutySlotInput
): Promise<VolunteerSlotWithDetails> {
  const slot = await prisma.volunteerDutySlot.findUnique({
    where: { id: input.slotId },
    include: {
      scheduledEvent: {
        include: {
          matchSelection: {
            include: { selectedPlayers: true },
          },
        },
      },
    },
  });

  if (!slot) {
    throw new Error("Volunteer duty slot not found.");
  }

  const updated = await prisma.volunteerDutySlot.update({
    where: { id: input.slotId },
    data: {
      assignedProfileId: input.memberProfileId,
      status: VolunteerSlotStatus.CLAIMED,
      claimedAt: new Date(),
      swapRequestedAt: null,
      swapReason: null,
      notes: input.notes !== undefined ? input.notes : slot.notes,
    },
    include: {
      scheduledEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          venueName: true,
          isHome: true,
          teamSquad: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      assignedProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // Notify assigned member
  if (updated.assignedProfile?.email) {
    try {
      await notificationService.sendEmail({
        to: updated.assignedProfile.email,
        subject: `[Roskilde Cricket Club] Assigned Volunteer Duty: ${updated.title}`,
        html: `
          <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0369a1;">Volunteer Duty Assigned</h2>
            <p>Dear ${updated.assignedProfile.firstName},</p>
            <p>You have been assigned to volunteer as <strong>${updated.title}</strong> for the upcoming fixture:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0; font-weight: bold;">${updated.scheduledEvent.title}</p>
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                Date & Time: ${new Date(updated.scheduledEvent.startAt).toLocaleString("da-DK")}<br />
                Venue: ${updated.scheduledEvent.venueName || "Roskilde Cricket Ground"}
              </p>
            </div>
            <p style="font-size: 12px; color: #64748b;">
              If you cannot attend, you can request a peer swap in the Roskilde Cricket App.
            </p>
          </div>
        `,
        text: `You have been assigned as ${updated.title} for ${updated.scheduledEvent.title} on ${new Date(updated.scheduledEvent.startAt).toLocaleDateString("da-DK")}.`,
      });
    } catch (err) {
      console.error("[assignVolunteerDutySlot] Email dispatch error:", err);
    }
  }

  return updated as VolunteerSlotWithDetails;
}

/**
 * 1-Tap Mobile Volunteer Claim: Member or parent self-signs up for an open volunteer slot.
 */
export async function claimVolunteerDutySlot(
  memberProfileId: string,
  input: ClaimVolunteerDutySlotInput
): Promise<{ slot: VolunteerSlotWithDetails; warningMessage?: string }> {
  const slot = await prisma.volunteerDutySlot.findUnique({
    where: { id: input.slotId },
    include: {
      scheduledEvent: {
        include: {
          matchSelection: {
            include: { selectedPlayers: true },
          },
        },
      },
    },
  });

  if (!slot) {
    throw new Error("Volunteer duty slot not found.");
  }

  // Check if member is in the Playing XI lineup
  const isPlayingInLineup =
    slot.scheduledEvent.matchSelection?.selectedPlayers.some(
      (p) => p.memberProfileId === memberProfileId && p.selectionRole === "STARTING"
    ) || false;

  const slotState: VolunteerSlotState = {
    id: slot.id,
    eventId: slot.eventId,
    dutyType: slot.dutyType,
    title: slot.title,
    status: slot.status,
    assignedProfileId: slot.assignedProfileId,
    claimedAt: slot.claimedAt,
    swapRequestedAt: slot.swapRequestedAt,
    swapReason: slot.swapReason,
    carpoolSeats: slot.carpoolSeats,
  };

  const validation = validateDutyClaim(slotState, memberProfileId, isPlayingInLineup);
  if (!validation.valid) {
    throw new Error(validation.error || "Cannot claim this volunteer slot.");
  }

  const updated = await prisma.volunteerDutySlot.update({
    where: { id: input.slotId },
    data: {
      assignedProfileId: memberProfileId,
      status: VolunteerSlotStatus.CLAIMED,
      claimedAt: new Date(),
      swapRequestedAt: null,
      swapReason: null,
      carpoolSeats:
        input.carpoolSeatsOffered !== undefined
          ? input.carpoolSeatsOffered
          : slot.carpoolSeats,
      notes: input.notes !== undefined ? input.notes : slot.notes,
    },
    include: {
      scheduledEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          venueName: true,
          isHome: true,
          teamSquad: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      assignedProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return {
    slot: updated as VolunteerSlotWithDetails,
    warningMessage: validation.warningMessage,
  };
}

/**
 * Request a peer-to-peer swap for a claimed volunteer duty slot.
 */
export async function requestVolunteerDutySwap(
  requesterProfileId: string,
  input: RequestVolunteerSwapInput
): Promise<VolunteerSlotWithDetails> {
  const slot = await prisma.volunteerDutySlot.findUnique({
    where: { id: input.slotId },
    include: {
      scheduledEvent: {
        include: {
          teamSquad: true,
        },
      },
      assignedProfile: true,
    },
  });

  if (!slot) {
    throw new Error("Volunteer duty slot not found.");
  }

  const slotState: VolunteerSlotState = {
    id: slot.id,
    eventId: slot.eventId,
    dutyType: slot.dutyType,
    title: slot.title,
    status: slot.status,
    assignedProfileId: slot.assignedProfileId,
    claimedAt: slot.claimedAt,
    swapRequestedAt: slot.swapRequestedAt,
    swapReason: slot.swapReason,
    carpoolSeats: slot.carpoolSeats,
  };

  const swapResult = requestDutySwap(slotState, requesterProfileId, input.swapReason);
  if (!swapResult.valid || !swapResult.updatedSlot) {
    throw new Error(swapResult.error || "Cannot request a duty swap.");
  }

  const updated = await prisma.volunteerDutySlot.update({
    where: { id: input.slotId },
    data: {
      status: swapResult.updatedSlot.status,
      swapRequestedAt: swapResult.updatedSlot.swapRequestedAt,
      swapReason: swapResult.updatedSlot.swapReason,
    },
    include: {
      scheduledEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          venueName: true,
          isHome: true,
          teamSquad: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      assignedProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return updated as VolunteerSlotWithDetails;
}

/**
 * Accept a pending peer swap request, reassigning the slot to the accepting volunteer.
 */
export async function acceptVolunteerDutySwap(
  acceptorProfileId: string,
  input: AcceptVolunteerSwapInput
): Promise<VolunteerSlotWithDetails> {
  const slot = await prisma.volunteerDutySlot.findUnique({
    where: { id: input.slotId },
    include: {
      scheduledEvent: true,
      assignedProfile: true,
    },
  });

  if (!slot) {
    throw new Error("Volunteer duty slot not found.");
  }

  const slotState: VolunteerSlotState = {
    id: slot.id,
    eventId: slot.eventId,
    dutyType: slot.dutyType,
    title: slot.title,
    status: slot.status,
    assignedProfileId: slot.assignedProfileId,
    claimedAt: slot.claimedAt,
    swapRequestedAt: slot.swapRequestedAt,
    swapReason: slot.swapReason,
    carpoolSeats: slot.carpoolSeats,
  };

  const acceptResult = acceptDutySwap(slotState, acceptorProfileId);
  if (!acceptResult.valid || !acceptResult.updatedSlot) {
    throw new Error(acceptResult.error || "Cannot accept this duty swap.");
  }

  const previousVolunteer = slot.assignedProfile;

  const updated = await prisma.volunteerDutySlot.update({
    where: { id: input.slotId },
    data: {
      status: acceptResult.updatedSlot.status,
      assignedProfileId: acceptResult.updatedSlot.assignedProfileId,
      claimedAt: acceptResult.updatedSlot.claimedAt,
      swapRequestedAt: null,
      swapReason: null,
    },
    include: {
      scheduledEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          venueName: true,
          isHome: true,
          teamSquad: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      assignedProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // Notify previous volunteer that their swap was accepted
  if (previousVolunteer?.email) {
    try {
      await notificationService.sendEmail({
        to: previousVolunteer.email,
        subject: `[Roskilde Cricket Club] Volunteer Duty Swap Accepted: ${updated.title}`,
        html: `
          <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #16a34a;">Duty Swap Confirmed</h2>
            <p>Dear ${previousVolunteer.firstName},</p>
            <p>Your swap request for <strong>${updated.title}</strong> has been accepted by <strong>${updated.assignedProfile?.firstName} ${updated.assignedProfile?.lastName}</strong>.</p>
            <p>You have been released from this duty commitment.</p>
          </div>
        `,
        text: `Your duty swap for ${updated.title} has been accepted by ${updated.assignedProfile?.firstName} ${updated.assignedProfile?.lastName}.`,
      });
    } catch (err) {
      console.error("[acceptVolunteerDutySwap] Email dispatch error:", err);
    }
  }

  return updated as VolunteerSlotWithDetails;
}

/**
 * Unassign a volunteer duty slot back to OPEN (Admin, Coach, or original volunteer).
 */
export async function unassignVolunteerDutySlot(
  slotId: string,
  requesterProfileId: string,
  requesterRoles: Role[]
): Promise<VolunteerSlotWithDetails> {
  const slot = await prisma.volunteerDutySlot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    throw new Error("Volunteer duty slot not found.");
  }

  const isStaff =
    requesterRoles.includes(Role.ADMIN) ||
    requesterRoles.includes(Role.COACH) ||
    requesterRoles.includes(Role.AD_HOC_COACH);
  const isAssigned = slot.assignedProfileId === requesterProfileId;

  if (!isStaff && !isAssigned) {
    throw new Error("Unauthorized to unassign this duty slot.");
  }

  const updated = await prisma.volunteerDutySlot.update({
    where: { id: slotId },
    data: {
      assignedProfileId: null,
      status: VolunteerSlotStatus.OPEN,
      claimedAt: null,
      swapRequestedAt: null,
      swapReason: null,
    },
    include: {
      scheduledEvent: {
        select: {
          id: true,
          title: true,
          date: true,
          startAt: true,
          endAt: true,
          venueName: true,
          isHome: true,
          teamSquad: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      assignedProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return updated as VolunteerSlotWithDetails;
}

/**
 * Delete a volunteer duty slot (Admin / Coach only).
 */
export async function deleteVolunteerDutySlot(
  slotId: string
): Promise<{ success: boolean }> {
  await prisma.volunteerDutySlot.delete({
    where: { id: slotId },
  });
  return { success: true };
}
