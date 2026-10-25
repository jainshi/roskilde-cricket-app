import {
  PrismaClient,
  SquadCategory,
  SquadStaffRole,
  RosterRole,
  FacilityType,
  EventType,
  MatchType,
  TrainingType,
  EventLifecycleStatus,
  RsvpStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function seedTeamsAndScheduling() {
  console.log("🏏 Starting Roskilde Cricket Club Teams & Scheduling Seed...\n");

  // ==========================================
  // 1. SEED CLUB FACILITIES
  // ==========================================
  console.log("🏟️ Seeding Club Facilities...");
  const facilitiesData = [
    {
      name: "Poppelgårdsvej Main Pitch",
      facilityType: FacilityType.MAIN_PITCH,
      location: "Poppelgårdsvej 10, 4000 Roskilde",
      capacity: 250,
      isActive: true,
    },
    {
      name: "Practice Nets 1-2",
      facilityType: FacilityType.PRACTICE_NETS,
      location: "Poppelgårdsvej Outdoor Nets East Lane",
      capacity: 12,
      isActive: true,
    },
    {
      name: "Practice Nets 3-4",
      facilityType: FacilityType.PRACTICE_NETS,
      location: "Poppelgårdsvej Outdoor Nets West Lane",
      capacity: 12,
      isActive: true,
    },
    {
      name: "Roskilde Hallen Arena",
      facilityType: FacilityType.INDOOR_HALL,
      location: "Møllehusvej 15, 4000 Roskilde",
      capacity: 80,
      isActive: true,
    },
    {
      name: "Poppelgårdsvej Clubhouse",
      facilityType: FacilityType.CLUBHOUSE,
      location: "Poppelgårdsvej 10, 4000 Roskilde",
      capacity: 50,
      isActive: true,
    },
  ];

  const facilities: Record<string, any> = {};
  for (const f of facilitiesData) {
    const facility = await prisma.clubFacility.upsert({
      where: { name: f.name },
      update: f,
      create: f,
    });
    facilities[f.name] = facility;
    console.log(`  ✅ Facility ready: "${facility.name}" (${facility.facilityType})`);
  }

  // ==========================================
  // 2. SEED SQUADS
  // ==========================================
  console.log("\n👥 Seeding Club Teams and Squads...");
  const squadsData = [
    {
      name: "Roskilde 1st XI",
      category: SquadCategory.SENIOR,
      ageGroupRule: "OPEN",
      defaultLineupSize: 11,
      genderGroup: "MENS",
      description: "Primary competitive men's first eleven competing in Danish Cricket Federation (DCF) 1. Division.",
    },
    {
      name: "Roskilde 2nd XI",
      category: SquadCategory.SENIOR,
      ageGroupRule: "OPEN",
      defaultLineupSize: 11,
      genderGroup: "MENS",
      description: "Development senior side competing in regional Zealand Division 2.",
    },
    {
      name: "Roskilde U15 Youth",
      category: SquadCategory.YOUTH,
      ageGroupRule: "U15",
      defaultLineupSize: 10,
      genderGroup: "MIXED",
      description: "Competitive youth squad under 15 years old with DCF dispensation rules.",
    },
    {
      name: "Roskilde U13 Youth",
      category: SquadCategory.YOUTH,
      ageGroupRule: "U13",
      defaultLineupSize: 8,
      genderGroup: "MIXED",
      description: "Junior youth developmental squad (8-a-side) fostering core bowling and batting fundamentals.",
    },
    {
      name: "Roskilde Women & Social XI",
      category: SquadCategory.SOCIAL,
      ageGroupRule: "OPEN",
      defaultLineupSize: 11,
      genderGroup: "MIXED",
      description: "Recreational, friendly, and introductory cricket for adult beginners, parents, and social matches.",
    },
  ];

  const squads: Record<string, any> = {};
  for (const s of squadsData) {
    const squad = await prisma.teamSquad.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
    squads[s.name] = squad;
    console.log(`  ✅ Squad ready: "${squad.name}" (${squad.category}, default lineup: ${squad.defaultLineupSize})`);
  }

  // ==========================================
  // 3. SEED COACH ASSIGNMENTS & ROSTERS
  // ==========================================
  console.log("\n🧢 Assigning Coaching Staff and Player Rosters...");
  
  // Find key test members from seed-users
  const coach1 = await prisma.memberProfile.findUnique({ where: { id: "coach001" } });
  const coach2 = await prisma.memberProfile.findUnique({ where: { id: "coach002" } });
  const adhocCoach = await prisma.memberProfile.findUnique({ where: { id: "adhoccoach001" } });
  const admin = await prisma.memberProfile.findUnique({ where: { id: "admin001" } });
  
  const seniorPlayer1 = await prisma.memberProfile.findUnique({ where: { id: "player001" } });
  const seniorPlayer2 = await prisma.memberProfile.findUnique({ where: { id: "player002" } });
  const seniorPlayer3 = await prisma.memberProfile.findUnique({ where: { id: "player003" } });
  
  const youth1 = await prisma.memberProfile.findUnique({ where: { id: "junior-player001" } }); // Lucas (U13, b. 2014)
  const youth2 = await prisma.memberProfile.findUnique({ where: { id: "junior-player002" } }); // Emma (b. 2016)
  const youth3 = await prisma.memberProfile.findUnique({ where: { id: "junior-player003" } }); // Oliver (U15, b. 2012)
  const youth4 = await prisma.memberProfile.findUnique({ where: { id: "junior-player004" } }); // Noah (U13, b. 2015)

  // Coach Assignments
  if (coach1) {
    await prisma.teamCoachAssignment.upsert({
      where: { teamSquadId_coachProfileId: { teamSquadId: squads["Roskilde 1st XI"].id, coachProfileId: coach1.id } },
      update: { role: SquadStaffRole.HEAD_COACH },
      create: { teamSquadId: squads["Roskilde 1st XI"].id, coachProfileId: coach1.id, role: SquadStaffRole.HEAD_COACH },
    });
    await prisma.teamCoachAssignment.upsert({
      where: { teamSquadId_coachProfileId: { teamSquadId: squads["Roskilde 2nd XI"].id, coachProfileId: coach1.id } },
      update: { role: SquadStaffRole.HEAD_COACH },
      create: { teamSquadId: squads["Roskilde 2nd XI"].id, coachProfileId: coach1.id, role: SquadStaffRole.HEAD_COACH },
    });
    console.log(`  ✅ Assigned Henrik Mortensen as Head Coach for 1st & 2nd XI`);
  }

  if (coach2) {
    await prisma.teamCoachAssignment.upsert({
      where: { teamSquadId_coachProfileId: { teamSquadId: squads["Roskilde U15 Youth"].id, coachProfileId: coach2.id } },
      update: { role: SquadStaffRole.HEAD_COACH },
      create: { teamSquadId: squads["Roskilde U15 Youth"].id, coachProfileId: coach2.id, role: SquadStaffRole.HEAD_COACH },
    });
    await prisma.teamCoachAssignment.upsert({
      where: { teamSquadId_coachProfileId: { teamSquadId: squads["Roskilde U13 Youth"].id, coachProfileId: coach2.id } },
      update: { role: SquadStaffRole.HEAD_COACH },
      create: { teamSquadId: squads["Roskilde U13 Youth"].id, coachProfileId: coach2.id, role: SquadStaffRole.HEAD_COACH },
    });
    console.log(`  ✅ Assigned Lars Nielsen as Head Coach for U15 & U13 Youth`);
  }

  if (adhocCoach) {
    await prisma.teamCoachAssignment.upsert({
      where: { teamSquadId_coachProfileId: { teamSquadId: squads["Roskilde Women & Social XI"].id, coachProfileId: adhocCoach.id } },
      update: { role: SquadStaffRole.AD_HOC_COACH },
      create: { teamSquadId: squads["Roskilde Women & Social XI"].id, coachProfileId: adhocCoach.id, role: SquadStaffRole.AD_HOC_COACH },
    });
    console.log(`  ✅ Assigned Ad-Hoc Coach for Women & Social XI`);
  }

  // Rosters
  // 1st XI Roster
  if (seniorPlayer1) {
    await prisma.teamRosterMember.upsert({
      where: { teamSquadId_memberProfileId: { teamSquadId: squads["Roskilde 1st XI"].id, memberProfileId: seniorPlayer1.id } },
      update: { rosterRole: RosterRole.CAPTAIN, jerseyNumber: 7 },
      create: { teamSquadId: squads["Roskilde 1st XI"].id, memberProfileId: seniorPlayer1.id, rosterRole: RosterRole.CAPTAIN, jerseyNumber: 7 },
    });
  }
  if (seniorPlayer2) {
    await prisma.teamRosterMember.upsert({
      where: { teamSquadId_memberProfileId: { teamSquadId: squads["Roskilde 1st XI"].id, memberProfileId: seniorPlayer2.id } },
      update: { rosterRole: RosterRole.VICE_CAPTAIN, jerseyNumber: 18 },
      create: { teamSquadId: squads["Roskilde 1st XI"].id, memberProfileId: seniorPlayer2.id, rosterRole: RosterRole.VICE_CAPTAIN, jerseyNumber: 18 },
    });
  }
  if (seniorPlayer3) {
    await prisma.teamRosterMember.upsert({
      where: { teamSquadId_memberProfileId: { teamSquadId: squads["Roskilde 1st XI"].id, memberProfileId: seniorPlayer3.id } },
      update: { rosterRole: RosterRole.PLAYER, jerseyNumber: 24 },
      create: { teamSquadId: squads["Roskilde 1st XI"].id, memberProfileId: seniorPlayer3.id, rosterRole: RosterRole.PLAYER, jerseyNumber: 24 },
    });
  }
  // Oliver (U15 youth) playing up into 1st XI
  if (youth3) {
    await prisma.teamRosterMember.upsert({
      where: { teamSquadId_memberProfileId: { teamSquadId: squads["Roskilde 1st XI"].id, memberProfileId: youth3.id } },
      update: { rosterRole: RosterRole.PLAYER, jerseyNumber: 99 },
      create: { teamSquadId: squads["Roskilde 1st XI"].id, memberProfileId: youth3.id, rosterRole: RosterRole.PLAYER, jerseyNumber: 99 },
    });
  }

  // U15 Youth Roster
  if (youth3) {
    await prisma.teamRosterMember.upsert({
      where: { teamSquadId_memberProfileId: { teamSquadId: squads["Roskilde U15 Youth"].id, memberProfileId: youth3.id } },
      update: { rosterRole: RosterRole.CAPTAIN, jerseyNumber: 10 },
      create: { teamSquadId: squads["Roskilde U15 Youth"].id, memberProfileId: youth3.id, rosterRole: RosterRole.CAPTAIN, jerseyNumber: 10 },
    });
  }
  if (youth1) {
    // Lucas (U13) playing up into U15
    await prisma.teamRosterMember.upsert({
      where: { teamSquadId_memberProfileId: { teamSquadId: squads["Roskilde U15 Youth"].id, memberProfileId: youth1.id } },
      update: { rosterRole: RosterRole.PLAYER, jerseyNumber: 12 },
      create: { teamSquadId: squads["Roskilde U15 Youth"].id, memberProfileId: youth1.id, rosterRole: RosterRole.PLAYER, jerseyNumber: 12 },
    });
  }

  // U13 Youth Roster
  if (youth1) {
    await prisma.teamRosterMember.upsert({
      where: { teamSquadId_memberProfileId: { teamSquadId: squads["Roskilde U13 Youth"].id, memberProfileId: youth1.id } },
      update: { rosterRole: RosterRole.CAPTAIN, jerseyNumber: 1 },
      create: { teamSquadId: squads["Roskilde U13 Youth"].id, memberProfileId: youth1.id, rosterRole: RosterRole.CAPTAIN, jerseyNumber: 1 },
    });
  }
  if (youth4) {
    await prisma.teamRosterMember.upsert({
      where: { teamSquadId_memberProfileId: { teamSquadId: squads["Roskilde U13 Youth"].id, memberProfileId: youth4.id } },
      update: { rosterRole: RosterRole.PLAYER, jerseyNumber: 5 },
      create: { teamSquadId: squads["Roskilde U13 Youth"].id, memberProfileId: youth4.id, rosterRole: RosterRole.PLAYER, jerseyNumber: 5 },
    });
  }

  console.log(`  ✅ Roster assignments complete across Senior and Youth squads`);

  // ==========================================
  // 4. SEED SCHEDULED FIXTURES & TRAINING SESSIONS
  // ==========================================
  console.log("\n📅 Seeding Scheduled Fixtures and Training Sessions...");
  const creatorId = admin ? admin.id : coach1?.id || "admin001";

  // Match 1: 1st XI vs Svanholm CC (Upcoming Saturday 13:00)
  const saturdayMatchDate = new Date();
  saturdayMatchDate.setDate(saturdayMatchDate.getDate() + ((6 - saturdayMatchDate.getDay() + 7) % 7 || 7));
  saturdayMatchDate.setHours(13, 0, 0, 0);

  const match1Start = new Date(saturdayMatchDate);
  const match1End = new Date(saturdayMatchDate);
  match1End.setHours(19, 0, 0, 0);
  const match1Meet = new Date(saturdayMatchDate);
  match1Meet.setHours(12, 0, 0, 0);
  const match1Rsvp = new Date(saturdayMatchDate);
  match1Rsvp.setDate(match1Rsvp.getDate() - 2);

  const fixture1 = await prisma.scheduledEvent.create({
    data: {
      teamSquadId: squads["Roskilde 1st XI"].id,
      facilityId: facilities["Poppelgårdsvej Main Pitch"].id,
      eventType: EventType.MATCH,
      matchType: MatchType.LEAGUE,
      title: "Roskilde 1st XI vs Svanholm CC (DCF League Round 1)",
      date: saturdayMatchDate,
      meetAt: match1Meet,
      startAt: match1Start,
      endAt: match1End,
      isHome: true,
      opponentName: "Svanholm Cricket Club",
      venueName: "Poppelgårdsvej Cricket Grounds",
      venueAddress: "Poppelgårdsvej 10, 4000 Roskilde",
      rsvpDeadlineAt: match1Rsvp,
      targetLineupSize: 11,
      lifecycleStatus: EventLifecycleStatus.SCHEDULED,
      scorecardUrl: "https://cricket.dk/fixtures/2026/div1/roskilde-vs-svanholm",
      createdById: creatorId,
    },
  });
  console.log(`  ✅ Scheduled League Fixture: "${fixture1.title}"`);

  // Auto-seed NO_RESPONSE RSVP for roster members of 1st XI
  const firstXiRoster = await prisma.teamRosterMember.findMany({
    where: { teamSquadId: squads["Roskilde 1st XI"].id },
  });
  for (const r of firstXiRoster) {
    await prisma.eventRsvp.upsert({
      where: { scheduledEventId_memberProfileId: { scheduledEventId: fixture1.id, memberProfileId: r.memberProfileId } },
      update: { status: RsvpStatus.NO_RESPONSE },
      create: {
        scheduledEventId: fixture1.id,
        memberProfileId: r.memberProfileId,
        submittedById: r.memberProfileId,
        status: RsvpStatus.NO_RESPONSE,
      },
    });
  }

  // Match 2: U15 Youth vs Albertslund CC (Saturday morning 09:30-12:30 on Main Pitch)
  const youthMatchDate = new Date(saturdayMatchDate);
  youthMatchDate.setHours(9, 30, 0, 0);
  const youthMatchEnd = new Date(saturdayMatchDate);
  youthMatchEnd.setHours(12, 30, 0, 0);

  const fixture2 = await prisma.scheduledEvent.create({
    data: {
      teamSquadId: squads["Roskilde U15 Youth"].id,
      facilityId: facilities["Poppelgårdsvej Main Pitch"].id,
      eventType: EventType.MATCH,
      matchType: MatchType.LEAGUE,
      title: "Roskilde U15 vs Albertslund CC (Youth Cup)",
      date: youthMatchDate,
      meetAt: new Date(youthMatchDate.getTime() - 45 * 60000),
      startAt: youthMatchDate,
      endAt: youthMatchEnd,
      isHome: true,
      opponentName: "Albertslund Cricket Club",
      venueName: "Poppelgårdsvej Cricket Grounds",
      venueAddress: "Poppelgårdsvej 10, 4000 Roskilde",
      rsvpDeadlineAt: match1Rsvp,
      targetLineupSize: 10, // Youth 10-a-side
      lifecycleStatus: EventLifecycleStatus.SCHEDULED,
      createdById: creatorId,
    },
  });
  console.log(`  ✅ Scheduled Youth Fixture: "${fixture2.title}"`);

  // Training Session: Weekly Net Practice (Every Tuesday 18:00-20:00 on Practice Nets 1-2)
  const tuesdayDate = new Date();
  tuesdayDate.setDate(tuesdayDate.getDate() + ((2 - tuesdayDate.getDay() + 7) % 7 || 7));
  tuesdayDate.setHours(18, 0, 0, 0);
  const tuesdayEnd = new Date(tuesdayDate);
  tuesdayEnd.setHours(20, 0, 0, 0);

  const trainingEvent = await prisma.scheduledEvent.create({
    data: {
      teamSquadId: squads["Roskilde 1st XI"].id,
      facilityId: facilities["Practice Nets 1-2"].id,
      eventType: EventType.TRAINING,
      trainingType: TrainingType.NET_PRACTICE,
      title: "Senior Squad Midweek Net Practice",
      date: tuesdayDate,
      meetAt: new Date(tuesdayDate.getTime() - 15 * 60000),
      startAt: tuesdayDate,
      endAt: tuesdayEnd,
      isHome: true,
      venueName: "Poppelgårdsvej Outdoor Nets",
      rsvpDeadlineAt: new Date(tuesdayDate.getTime() - 24 * 3600000),
      targetLineupSize: 11,
      lifecycleStatus: EventLifecycleStatus.SCHEDULED,
      createdById: creatorId,
    },
  });
  console.log(`  ✅ Scheduled Training Practice: "${trainingEvent.title}"`);

  console.log("\n🎉 Roskilde Cricket Club Teams & Scheduling Seed Completed Successfully!");
}

seedTeamsAndScheduling()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
