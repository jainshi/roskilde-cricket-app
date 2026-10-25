import { prisma } from "@/lib/db";
import {
  CreateSquadInput,
  UpdateSquadInput,
  AssignRosterMemberInput,
  AssignSquadCoachInput,
} from "../contracts/squad.contract";
import {
  evaluateAgeEligibility,
  AgeEligibilityResult,
} from "../domain/age-eligibility";
import { RosterRole, SquadCategory, SquadStaffRole } from "@prisma/client";

export interface SquadWithDetails {
  id: string;
  name: string;
  category: SquadCategory;
  ageGroupRule: string | null;
  defaultLineupSize: number;
  genderGroup: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  coachAssignments: Array<{
    id: string;
    role: SquadStaffRole;
    coachProfile: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  }>;
  roster: Array<{
    id: string;
    rosterRole: RosterRole;
    jerseyNumber: number | null;
    hasDispensation: boolean;
    dispensationNotes: string | null;
    joinedAt: Date;
    isActive: boolean;
    memberProfile: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      dateOfBirth: Date | null;
      battingPosition: string | null;
      bowlingStyle: string | null;
    };
  }>;
  _count: {
    scheduledEvents: number;
    roster: number;
  };
}

/**
 * Retrieves all club squads with optional category filter.
 */
export async function getAllSquads(filter?: {
  category?: SquadCategory;
  isActive?: boolean;
}): Promise<SquadWithDetails[]> {
  const where: any = {};
  if (filter?.category) where.category = filter.category;
  if (filter?.isActive !== undefined) where.isActive = filter.isActive;

  const squads = await prisma.teamSquad.findMany({
    where,
    include: {
      coachAssignments: {
        include: {
          coachProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      roster: {
        where: { isActive: true },
        include: {
          memberProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              dateOfBirth: true,
              battingPosition: true,
              bowlingStyle: true,
            },
          },
        },
        orderBy: [{ rosterRole: "desc" }, { joinedAt: "asc" }],
      },
      _count: {
        select: {
          scheduledEvents: true,
          roster: { where: { isActive: true } },
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return squads as unknown as SquadWithDetails[];
}

/**
 * Retrieves a single squad with complete coaching staff, active roster, and event counts.
 */
export async function getSquadById(id: string): Promise<SquadWithDetails | null> {
  const squad = await prisma.teamSquad.findUnique({
    where: { id },
    include: {
      coachAssignments: {
        include: {
          coachProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      roster: {
        where: { isActive: true },
        include: {
          memberProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              dateOfBirth: true,
              battingPosition: true,
              bowlingStyle: true,
            },
          },
        },
        orderBy: [{ rosterRole: "desc" }, { joinedAt: "asc" }],
      },
      _count: {
        select: {
          scheduledEvents: true,
          roster: { where: { isActive: true } },
        },
      },
    },
  });

  return squad as unknown as SquadWithDetails | null;
}

/**
 * Creates a new squad in the database.
 */
export async function createSquad(input: CreateSquadInput) {
  const existing = await prisma.teamSquad.findUnique({
    where: { name: input.name },
  });
  if (existing) {
    throw new Error(`A squad with the name "${input.name}" already exists.`);
  }

  return prisma.teamSquad.create({
    data: {
      name: input.name,
      category: input.category,
      ageGroupRule: input.ageGroupRule || "OPEN",
      defaultLineupSize: input.defaultLineupSize,
      genderGroup: input.genderGroup,
      description: input.description,
      isActive: true,
    },
  });
}

/**
 * Updates an existing squad's details.
 */
export async function updateSquad(input: UpdateSquadInput) {
  return prisma.teamSquad.update({
    where: { id: input.id },
    data: {
      name: input.name,
      category: input.category,
      ageGroupRule: input.ageGroupRule,
      defaultLineupSize: input.defaultLineupSize,
      genderGroup: input.genderGroup,
      description: input.description,
      isActive: input.isActive,
    },
  });
}

/**
 * Assigns a player to a squad roster with automated age-eligibility validation.
 */
export async function assignRosterMember(input: AssignRosterMemberInput): Promise<{
  membership: any;
  eligibility: AgeEligibilityResult;
}> {
  const squad = await prisma.teamSquad.findUnique({
    where: { id: input.teamSquadId },
  });
  if (!squad) {
    throw new Error("Squad not found.");
  }

  const member = await prisma.memberProfile.findUnique({
    where: { id: input.memberProfileId },
  });
  if (!member) {
    throw new Error("Member profile not found.");
  }

  // 1. Evaluate Age Eligibility
  const eligibility = evaluateAgeEligibility({
    dateOfBirth: member.dateOfBirth,
    ageGroupRule: squad.ageGroupRule,
    squadCategory: squad.category,
    hasDispensation: input.hasDispensation,
  });

  if (!eligibility.isAllowed) {
    throw new Error(`Age eligibility failed: ${eligibility.reason}`);
  }

  // 2. Handle Captain / Vice-Captain unique leadership rules
  if (input.rosterRole === "CAPTAIN") {
    // Demote any existing captain in this squad to player
    await prisma.teamRosterMember.updateMany({
      where: {
        teamSquadId: input.teamSquadId,
        rosterRole: "CAPTAIN",
        memberProfileId: { not: input.memberProfileId },
      },
      data: { rosterRole: "PLAYER" },
    });
  }

  // 3. Upsert roster membership
  const membership = await prisma.teamRosterMember.upsert({
    where: {
      teamSquadId_memberProfileId: {
        teamSquadId: input.teamSquadId,
        memberProfileId: input.memberProfileId,
      },
    },
    update: {
      rosterRole: input.rosterRole,
      jerseyNumber: input.jerseyNumber,
      hasDispensation: input.hasDispensation,
      dispensationNotes: input.dispensationNotes,
      isActive: true,
    },
    create: {
      teamSquadId: input.teamSquadId,
      memberProfileId: input.memberProfileId,
      rosterRole: input.rosterRole,
      jerseyNumber: input.jerseyNumber,
      hasDispensation: input.hasDispensation,
      dispensationNotes: input.dispensationNotes,
      isActive: true,
    },
    include: {
      memberProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          battingPosition: true,
          bowlingStyle: true,
        },
      },
    },
  });

  return { membership, eligibility };
}

/**
 * Removes a member from an active squad roster.
 */
export async function removeRosterMember(teamSquadId: string, memberProfileId: string) {
  return prisma.teamRosterMember.delete({
    where: {
      teamSquadId_memberProfileId: {
        teamSquadId,
        memberProfileId,
      },
    },
  });
}

/**
 * Assigns a coach or staff leader to a squad.
 */
export async function assignSquadCoach(input: AssignSquadCoachInput) {
  return prisma.teamCoachAssignment.upsert({
    where: {
      teamSquadId_coachProfileId: {
        teamSquadId: input.teamSquadId,
        coachProfileId: input.coachProfileId,
      },
    },
    update: { role: input.role },
    create: {
      teamSquadId: input.teamSquadId,
      coachProfileId: input.coachProfileId,
      role: input.role,
    },
    include: {
      coachProfile: {
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
}

/**
 * Removes a coach assignment from a squad.
 */
export async function removeSquadCoach(teamSquadId: string, coachProfileId: string) {
  return prisma.teamCoachAssignment.delete({
    where: {
      teamSquadId_coachProfileId: {
        teamSquadId,
        coachProfileId,
      },
    },
  });
}

/**
 * Retrieves all club members who are candidates for adding to a squad,
 * with their age-eligibility status pre-calculated.
 */
export async function getEligibleCandidatesForSquad(teamSquadId: string) {
  const squad = await prisma.teamSquad.findUnique({
    where: { id: teamSquadId },
    include: { roster: { select: { memberProfileId: true } } },
  });
  if (!squad) throw new Error("Squad not found.");

  const rosteredMemberIds = new Set(squad.roster.map((r) => r.memberProfileId));

  const allMembers = await prisma.memberProfile.findMany({
    where: { isAnonymized: false },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      battingPosition: true,
      bowlingStyle: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return allMembers.map((member) => {
    const isAlreadyRostered = rosteredMemberIds.has(member.id);
    const eligibility = evaluateAgeEligibility({
      dateOfBirth: member.dateOfBirth,
      ageGroupRule: squad.ageGroupRule,
      squadCategory: squad.category,
    });

    return {
      ...member,
      isAlreadyRostered,
      eligibility,
    };
  });
}
