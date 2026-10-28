import {
  PrismaClient,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
  VolunteerDutyType,
  VolunteerSlotStatus,
  DocumentCategory,
  Role,
} from "@prisma/client";

const prisma = new PrismaClient();

export async function seedCommunications() {
  console.log("📢 Starting Roskilde Cricket Club Communications & Volunteer Seed...\n");

  // 1. Fetch key profiles
  const admin = await prisma.memberProfile.findFirst({
    where: { roleAssignments: { some: { role: Role.ADMIN } } },
  });

  const coach = await prisma.memberProfile.findFirst({
    where: { roleAssignments: { some: { role: Role.COACH } } },
  }) || admin;

  const player = await prisma.memberProfile.findFirst({
    where: { roleAssignments: { some: { role: Role.PLAYER } }, isAnonymized: false },
  });

  const parent = await prisma.memberProfile.findFirst({
    where: { roleAssignments: { some: { role: Role.PARENT } } },
  });

  if (!admin) {
    throw new Error("Admin profile not found. Please run npm run seed:users first.");
  }

  const activeCoach = coach || admin;

  // 2. Fetch squads and scheduled events
  const seniorSquad = await prisma.teamSquad.findFirst({
    where: { name: { contains: "Senior" } },
  });

  const youthSquad = await prisma.teamSquad.findFirst({
    where: { name: { contains: "Youth" } },
  });

  const upcomingEvent = await prisma.scheduledEvent.findFirst({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
  }) || await prisma.scheduledEvent.findFirst();

  // ==========================================
  // 3. SEED CLUB ANNOUNCEMENTS
  // ==========================================
  console.log("📰 Seeding Club Announcements...");

  const announcementsData = [
    {
      title: "Annual General Meeting (AGM) 2026 & Season Kickoff",
      slug: "agm-notice-2026",
      content: `### Roskilde Cricket Club - Ordinær Generalforsamling 2026

Dear Members and Parents,

You are cordially invited to the Roskilde Cricket Club Annual General Meeting (Generalforsamling) on **Saturday, March 14, 2026 at 14:00** in the RCC Clubhouse at Kildegårdsskolen.

**Agenda**:
1. Election of Conductor and Minute Taker
2. Board of Directors Report for 2025
3. Financial Statements and Auditor's Report
4. Membership Dues & Budget Approval for 2026
5. Election of Board Members and Auditor
6. Any Other Business

Coffee, Danish pastries, and refreshments will be served. All active members and parents of youth players have speaking and voting rights.`,
      category: AnnouncementCategory.AGM,
      priority: AnnouncementPriority.AGM_NOTICE,
      audience: AnnouncementAudience.ALL_MEMBERS,
      authorProfileId: admin.id,
      isPinned: true,
      publishedAt: new Date(),
    },
    {
      title: "Senior 1st XI Outdoor Nets Training Schedule - Spring 2026",
      slug: "senior-training-schedule-spring-2026",
      content: `### Outdoor Ground Training Kickoff

Senior 1st & 2nd XI practice begins on **Tuesday, April 7, 2026 at 17:30** on the main turf practice nets at Roskilde Cricket Ground.

Please ensure your match kits and spiked shoes are prepared. Check your squad availability in the Events calendar.`,
      category: AnnouncementCategory.SQUAD_UPDATE,
      priority: AnnouncementPriority.NORMAL,
      audience: AnnouncementAudience.SQUAD_SPECIFIC,
      targetSquadId: seniorSquad?.id || null,
      authorProfileId: activeCoach.id,
      isPinned: false,
      publishedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
    {
      title: "Youth U15 Kit Distribution & Away Match Travel Protocol",
      slug: "youth-u15-kit-distribution-travel",
      content: `### Masuri Gear Distribution for Junior Players

All registered Youth U15 players can collect their Masuri training gear and loaned helmets at the clubhouse this Thursday between 16:30 and 18:00.

**Carpool Volunteers Needed**:
For our first away fixture against Svanholm CC on May 10th, we need 2 parent volunteer drivers. Please sign up in the Volunteer Duty Roster tab on the event page.`,
      category: AnnouncementCategory.SQUAD_UPDATE,
      priority: AnnouncementPriority.NORMAL,
      audience: AnnouncementAudience.SQUAD_SPECIFIC,
      targetSquadId: youthSquad?.id || null,
      authorProfileId: activeCoach.id,
      isPinned: false,
      publishedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    },
  ];

  for (const ann of announcementsData) {
    const created = await prisma.announcement.upsert({
      where: { slug: ann.slug },
      update: ann,
      create: ann,
    });

    // Seed read receipt for player if exists
    if (player) {
      await prisma.announcementReadReceipt.upsert({
        where: {
          announcementId_memberProfileId: {
            announcementId: created.id,
            memberProfileId: player.id,
          },
        },
        update: { readAt: new Date() },
        create: {
          announcementId: created.id,
          memberProfileId: player.id,
          readAt: new Date(),
        },
      });
    }
  }

  // ==========================================
  // 4. SEED VOLUNTEER DUTY ROSTER SLOTS
  // ==========================================
  if (upcomingEvent) {
    console.log(`🤝 Seeding Volunteer Duty Slots for Event: ${upcomingEvent.title}...`);

    const volunteerSlots = [
      {
        eventId: upcomingEvent.id,
        dutyType: VolunteerDutyType.SCORING,
        title: "Official DCF Match Scorer",
        description: "Operate the DCF electronic live scoring tablet and official paper scorebook during match innings.",
        status: VolunteerSlotStatus.OPEN,
        assignedProfileId: null,
      },
      {
        eventId: upcomingEvent.id,
        dutyType: VolunteerDutyType.UMPIRING,
        title: "Square-Leg Umpire (1st Innings)",
        description: "Official square-leg umpiring duty for the first 25 overs. Knowledge of run-out and stumping rules required.",
        status: VolunteerSlotStatus.CLAIMED,
        assignedProfileId: player?.id || null,
        claimedAt: new Date(Date.now() - 24 * 3600 * 1000),
      },
      {
        eventId: upcomingEvent.id,
        dutyType: VolunteerDutyType.TEA_CATERING,
        title: "Match-Day Tea & Hospitality",
        description: "Prepare mid-match tea, sandwiches, fruit, and cordial for home and visiting teams during the 40-minute tea interval.",
        status: VolunteerSlotStatus.OPEN,
        assignedProfileId: null,
      },
      {
        eventId: upcomingEvent.id,
        dutyType: VolunteerDutyType.YOUTH_CARPOOL,
        title: "Away Fixture Youth Carpool Driver",
        description: "Transport 3 junior players to the away ground. Fuel allowance covered by RCC club travel pool.",
        status: VolunteerSlotStatus.SWAP_REQUESTED,
        assignedProfileId: parent?.id || null,
        claimedAt: new Date(Date.now() - 48 * 3600 * 1000),
        swapRequestedAt: new Date(Date.now() - 2 * 3600 * 1000),
        swapReason: "Called into weekend emergency medical on-call duty.",
        carpoolSeats: 3,
      },
    ];

    for (const slot of volunteerSlots) {
      const existing = await prisma.volunteerDutySlot.findFirst({
        where: { eventId: slot.eventId, dutyType: slot.dutyType },
      });

      if (existing) {
        await prisma.volunteerDutySlot.update({
          where: { id: existing.id },
          data: slot,
        });
      } else {
        await prisma.volunteerDutySlot.create({
          data: slot,
        });
      }
    }
  }

  // ==========================================
  // 5. SEED CLUB GOVERNANCE DOCUMENTS
  // ==========================================
  console.log("📜 Seeding Club Governance Documents & Policies...");

  const documentsData = [
    {
      title: "Roskilde Cricket Club Vedtægter (Club Bylaws)",
      slug: "rcc-vedtaegter-2026",
      category: DocumentCategory.BYLAWS,
      version: "2026.1",
      fileUrl: "https://roskildecricket.dk/docs/vedtaegter-2026.pdf",
      contentMarkdown: `## Roskilde Cricket Club - Vedtægter

### § 1. Navn og Hjemsted
Klubbens navn er Roskilde Cricket Club (RCC). Foreningens hjemsted er Roskilde Kommune.

### § 2. Formål
Foreningens formål er at fremme interessen for cricketsporten i Roskilde og omegn samt tilbyde idræts- og fællesskabsaktiviteter for børn, unge og voksne i overensstemmelse med Danmarks Idrætsforbunds (DIF) etiske retningslinjer.

### § 3. Medlemskab
Som aktivt eller passivt medlem kan optages enhver, der tilslutter sig klubbens formål. Optagelse af umyndige kræver skriftligt samtykke fra forældre eller værge.`,
      requiresSignOff: false,
      isActive: true,
    },
    {
      title: "RCC Child Protection & Børneattest Compliance Guidelines",
      slug: "rcc-child-safety-borneattest-2026",
      category: DocumentCategory.CHILD_SAFETY,
      version: "2026.1",
      fileUrl: "https://roskildecricket.dk/docs/borneattest-retningslinjer-2026.pdf",
      contentMarkdown: `## RCC Børnebeskyttelsespolitik og Børneattest (Child Safeguarding)

I overensstemmelse med dansk lovgivning (Børneattestloven) og Danmarks Cricket-Forbunds (DCF) regelsæt indhenter Roskilde Cricket Club obligatorisk børneattest på samtlige trænere, holdledere og faste frivillige med direkte kontakt til børn under 15 år.

### Forpligtelser for Trænere og Frivillige:
1. **Børneattest**: Du accepterer, at klubben årligt indhenter digital børneattest via Kriminalregisteret.
2. **Nul-Tolerance over for Grænseoverskridende Adfærd**: Fysisk, psykisk eller verbal mobning og upassende adfærd accepteres under ingen omstændigheder.
3. **To Voksne-Princippet**: Ved omklædning, fysioterapi og overnatninger til stævner skal der altid være mindst to voksne til stede.
4. **Underretningspligt**: Enhver mistanke om mistrivsel eller overgreb skal omgående indberettes til klubbens bestyrelse og de sociale myndigheder.`,
      requiresSignOff: true,
      targetRole: Role.COACH,
      isActive: true,
    },
    {
      title: "RCC Seasonal Code of Conduct & Fair Play Rules 2026",
      slug: "rcc-code-of-conduct-2026",
      category: DocumentCategory.CODE_OF_CONDUCT,
      version: "2026.1",
      fileUrl: "https://roskildecricket.dk/docs/code-of-conduct-2026.pdf",
      contentMarkdown: `## Roskilde Cricket Club - Code of Conduct 2026

Cricket is a sport rooted in integrity, respect, and the "Spirit of Cricket". All players, coaches, parents, and spectators representing Roskilde Cricket Club must abide by the following standards:

1. **Respect the Umpires**: The umpire's decision is final. Dissent, aggressive gestures, or verbal questioning of decisions will not be tolerated.
2. **Support Your Teammates**: Cricket is a team game. Encourage fellow players, especially junior members developing their skills.
3. **Punctuality & Equipment Care**: Arrive on time for match warm-ups. Treat club equipment, practice nets, and the turf wicket with utmost care.
4. **Clean Playing Apparel**: Official white or cream clothing for traditional league matches; official RCC coloured kit for limited-overs fixtures.`,
      requiresSignOff: true,
      targetRole: Role.PLAYER,
      isActive: true,
    },
  ];

  for (const doc of documentsData) {
    const createdDoc = await prisma.clubDocument.upsert({
      where: { slug: doc.slug },
      update: doc,
      create: doc,
    });

    // Seed a sample sign-off by player
    if (player && createdDoc.requiresSignOff && createdDoc.targetRole === Role.PLAYER) {
      await prisma.documentSignOff.upsert({
        where: {
          documentId_memberProfileId_versionSigned: {
            documentId: createdDoc.id,
            memberProfileId: player.id,
            versionSigned: createdDoc.version,
          },
        },
        update: { signedAt: new Date() },
        create: {
          documentId: createdDoc.id,
          memberProfileId: player.id,
          versionSigned: createdDoc.version,
          signedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        },
      });
    }
  }

  console.log("\n✅ Roskilde Cricket Club Communications & Volunteer Seed Completed Successfully!\n");
}

if (require.main === module) {
  seedCommunications()
    .catch((e) => {
      console.error("❌ Seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
