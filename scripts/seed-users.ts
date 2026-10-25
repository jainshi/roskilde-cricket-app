import { PrismaClient, Role, AccountStatus, BattingPosition, BowlingStyle, ApparelSize } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const SHARED_PASSWORD = "Roskilde@123";

async function main() {
  console.log(`\n🌱 Starting Roskilde Cricket Club User Seeding...`);
  console.log(`🔐 Master Password for all test users: "${SHARED_PASSWORD}"\n`);

  const passwordHash = await argon2.hash(SHARED_PASSWORD, {
    type: argon2.argon2id,
  });

  // Reset and unlock all existing user accounts with the updated password hash
  await prisma.userAccount.updateMany({
    data: {
      passwordHash,
      status: AccountStatus.ACTIVE,
      mustResetPassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  // 1. Super Admin
  const adminProfileId = "admin001";
  const adminEmail = "admin001@roskildecricket.dk";

  await prisma.memberProfile.upsert({
    where: { id: adminProfileId },
    update: {
      firstName: "Super",
      lastName: "Admin",
      email: adminEmail,
    },
    create: {
      id: adminProfileId,
      firstName: "Super",
      lastName: "Admin",
      email: adminEmail,
      phone: "+45 11 22 33 44",
      dateOfBirth: new Date("1985-01-01"),
      roleAssignments: {
        create: { role: Role.ADMIN },
      },
      privacySettings: {
        create: {
          showEmailInDirectory: true,
          showPhoneInDirectory: false,
          showAddressInDirectory: false,
        },
      },
      userAccount: {
        create: {
          id: "user-admin001",
          email: adminEmail,
          passwordHash,
          status: AccountStatus.ACTIVE,
          mustResetPassword: false,
        },
      },
    },
  });
  console.log(`✅ Admin ready: id="${adminProfileId}", email="${adminEmail}"`);

  // Also ensure legacy admin@roskildecricket.dk has password updated to Rodkilde@123
  await prisma.userAccount.updateMany({
    where: { email: "admin@roskildecricket.dk" },
    data: { passwordHash, status: AccountStatus.ACTIVE, mustResetPassword: false },
  });

  // 2. Coaches
  const coaches = [
    {
      id: "coach001",
      email: "coach001@roskildecricket.dk",
      firstName: "Henrik",
      lastName: "Mortensen",
      phone: "+45 20 11 22 33",
      dob: new Date("1980-05-12"),
      title: "Senior Head Coach",
      batting: BattingPosition.MIDDLE_ORDER,
      bowling: BowlingStyle.RIGHT_ARM_MEDIUM,
    },
    {
      id: "coach002",
      email: "coach002@roskildecricket.dk",
      firstName: "Lars",
      lastName: "Nielsen",
      phone: "+45 20 44 55 66",
      dob: new Date("1988-09-18"),
      title: "Youth Development Coach",
      batting: BattingPosition.TOP_ORDER,
      bowling: BowlingStyle.OFF_SPIN,
    },
  ];

  for (const coach of coaches) {
    await prisma.memberProfile.upsert({
      where: { id: coach.id },
      update: {
        firstName: coach.firstName,
        lastName: coach.lastName,
        email: coach.email,
        phone: coach.phone,
      },
      create: {
        id: coach.id,
        firstName: coach.firstName,
        lastName: coach.lastName,
        email: coach.email,
        phone: coach.phone,
        dateOfBirth: coach.dob,
        battingPosition: coach.batting,
        bowlingStyle: coach.bowling,
        roleAssignments: {
          create: { role: Role.COACH },
        },
        privacySettings: {
          create: {
            showEmailInDirectory: true,
            showPhoneInDirectory: true,
            showAddressInDirectory: false,
          },
        },
        userAccount: {
          create: {
            id: `user-${coach.id}`,
            email: coach.email,
            passwordHash,
            status: AccountStatus.ACTIVE,
            mustResetPassword: false,
          },
        },
      },
    });
    console.log(`✅ Coach ready: id="${coach.id}", email="${coach.email}" (${coach.firstName} ${coach.lastName})`);
  }

  // Update legacy coach password as well
  await prisma.userAccount.updateMany({
    where: { email: "coach@roskildecricket.dk" },
    data: { passwordHash, status: AccountStatus.ACTIVE, mustResetPassword: false },
  });

  // 3. Parents and Linked Youth / Junior Players
  const familyUnits = [
    {
      parentId: "parent001",
      parentEmail: "parent001@roskildecricket.dk",
      parentFirst: "Søren",
      parentLast: "Hansen",
      parentPhone: "+45 33 44 55 66",
      parentDob: new Date("1983-09-20"),
      relationship: "Father",
      children: [
        {
          id: "junior-player001",
          email: "junior-player001@roskildecricket.dk",
          firstName: "Lucas",
          lastName: "Hansen",
          dob: new Date("2014-04-10"), // 12 years old (U13 Youth)
          batting: BattingPosition.TOP_ORDER,
          bowling: BowlingStyle.RIGHT_ARM_FAST,
          shirt: ApparelSize.YOUTH_M,
          trouser: ApparelSize.YOUTH_M,
          cap: ApparelSize.YOUTH_M,
        },
        {
          id: "junior-player002",
          email: "junior-player002@roskildecricket.dk",
          firstName: "Emma",
          lastName: "Hansen",
          dob: new Date("2016-08-15"), // 10 years old (U11 Junior)
          batting: BattingPosition.MIDDLE_ORDER,
          bowling: BowlingStyle.DOES_NOT_BOWL,
          shirt: ApparelSize.YOUTH_S,
          trouser: ApparelSize.YOUTH_S,
          cap: ApparelSize.YOUTH_S,
        },
      ],
    },
    {
      parentId: "parent002",
      parentEmail: "parent002@roskildecricket.dk",
      parentFirst: "Mette",
      parentLast: "Jensen",
      parentPhone: "+45 44 55 66 77",
      parentDob: new Date("1986-12-04"),
      relationship: "Mother",
      children: [
        {
          id: "junior-player003",
          email: "junior-player003@roskildecricket.dk",
          firstName: "Oliver",
          lastName: "Jensen",
          dob: new Date("2012-11-05"), // 13 years old (U15 Youth)
          batting: BattingPosition.TOP_ORDER,
          bowling: BowlingStyle.RIGHT_ARM_MEDIUM,
          shirt: ApparelSize.YOUTH_L,
          trouser: ApparelSize.YOUTH_L,
          cap: ApparelSize.YOUTH_L,
        },
      ],
    },
    {
      parentId: "parent003",
      parentEmail: "parent003@roskildecricket.dk",
      parentFirst: "Anders",
      parentLast: "Rasmussen",
      parentPhone: "+45 55 66 77 88",
      parentDob: new Date("1981-03-15"),
      relationship: "Father",
      children: [
        {
          id: "junior-player004",
          email: "junior-player004@roskildecricket.dk",
          firstName: "Noah",
          lastName: "Rasmussen",
          dob: new Date("2015-02-20"), // 11 years old (U13 Junior)
          batting: BattingPosition.MIDDLE_ORDER,
          bowling: BowlingStyle.LEFT_ARM_ORTHODOX,
          shirt: ApparelSize.YOUTH_M,
          trouser: ApparelSize.YOUTH_M,
          cap: ApparelSize.YOUTH_M,
        },
      ],
    },
  ];

  for (const fam of familyUnits) {
    // Create/Upsert Parent
    await prisma.memberProfile.upsert({
      where: { id: fam.parentId },
      update: {
        firstName: fam.parentFirst,
        lastName: fam.parentLast,
        email: fam.parentEmail,
        phone: fam.parentPhone,
      },
      create: {
        id: fam.parentId,
        firstName: fam.parentFirst,
        lastName: fam.parentLast,
        email: fam.parentEmail,
        phone: fam.parentPhone,
        dateOfBirth: fam.parentDob,
        roleAssignments: {
          create: { role: Role.PARENT },
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
            id: `user-${fam.parentId}`,
            email: fam.parentEmail,
            passwordHash,
            status: AccountStatus.ACTIVE,
            mustResetPassword: false,
          },
        },
      },
    });
    console.log(`✅ Parent ready: id="${fam.parentId}", email="${fam.parentEmail}" (${fam.parentFirst} ${fam.parentLast})`);

    // Create Children linked to this Parent
    let slot = 1;
    for (const ch of fam.children) {
      await prisma.memberProfile.upsert({
        where: { id: ch.id },
        update: {
          firstName: ch.firstName,
          lastName: ch.lastName,
          email: ch.email,
        },
        create: {
          id: ch.id,
          firstName: ch.firstName,
          lastName: ch.lastName,
          email: ch.email,
          dateOfBirth: ch.dob,
          battingPosition: ch.batting,
          bowlingStyle: ch.bowling,
          shirtSize: ch.shirt,
          trouserSize: ch.trouser,
          capSize: ch.cap,
          roleAssignments: {
            create: { role: Role.PLAYER },
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
              id: `user-${ch.id}`,
              email: ch.email,
              passwordHash,
              status: AccountStatus.ACTIVE,
              mustResetPassword: false,
            },
          },
        },
      });

      // Bind parent-child link
      await prisma.parentChildLink.upsert({
        where: {
          id: `link-${fam.parentId}-${ch.id}`,
        },
        update: {
          relationship: fam.relationship,
        },
        create: {
          id: `link-${fam.parentId}-${ch.id}`,
          playerId: ch.id,
          parentId: fam.parentId,
          slot: slot++,
          relationship: fam.relationship,
        },
      });

      console.log(`   👶 Junior Player ready: id="${ch.id}", email="${ch.email}" (${ch.firstName} ${ch.lastName}) -> Linked to ${fam.parentId}`);
    }
  }

  // Update legacy parent password as well
  await prisma.userAccount.updateMany({
    where: { email: "parent@roskildecricket.dk" },
    data: { passwordHash, status: AccountStatus.ACTIVE, mustResetPassword: false },
  });

  // 4. Senior / Adult Players
  const adultPlayers = [
    {
      id: "adult-player-001",
      email: "adult-player-001@roskildecricket.dk",
      firstName: "Vikram",
      lastName: "Sharma",
      phone: "+45 61 72 83 94",
      dob: new Date("1996-03-14"), // 30 years old (Senior 1st XI All-Rounder)
      batting: BattingPosition.TOP_ORDER,
      bowling: BowlingStyle.RIGHT_ARM_FAST,
      shirt: ApparelSize.ADULT_L,
      trouser: ApparelSize.ADULT_L,
      cap: ApparelSize.ADULT_L,
    },
    {
      id: "adult-player-002",
      email: "adult-player-002@roskildecricket.dk",
      firstName: "Christian",
      lastName: "Lindqvist",
      phone: "+45 71 82 93 04",
      dob: new Date("1992-07-22"), // 34 years old (Senior Captain)
      batting: BattingPosition.OPENING_BATTER,
      bowling: BowlingStyle.OFF_SPIN,
      shirt: ApparelSize.ADULT_M,
      trouser: ApparelSize.ADULT_M,
      cap: ApparelSize.ADULT_M,
    },
    {
      id: "adult-player-003",
      email: "adult-player-003@roskildecricket.dk",
      firstName: "Rasmus",
      lastName: "Toft",
      phone: "+45 81 92 03 14",
      dob: new Date("2002-10-18"), // 24 years old (Senior 2nd XI)
      batting: BattingPosition.TAILENDER,
      bowling: BowlingStyle.LEFT_ARM_FAST,
      shirt: ApparelSize.ADULT_XL,
      trouser: ApparelSize.ADULT_XL,
      cap: ApparelSize.ADULT_L,
    },
  ];

  for (const player of adultPlayers) {
    await prisma.memberProfile.upsert({
      where: { id: player.id },
      update: {
        firstName: player.firstName,
        lastName: player.lastName,
        email: player.email,
        phone: player.phone,
      },
      create: {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        email: player.email,
        phone: player.phone,
        dateOfBirth: player.dob,
        battingPosition: player.batting,
        bowlingStyle: player.bowling,
        shirtSize: player.shirt,
        trouserSize: player.trouser,
        capSize: player.cap,
        roleAssignments: {
          create: { role: Role.PLAYER },
        },
        privacySettings: {
          create: {
            showEmailInDirectory: true,
            showPhoneInDirectory: true,
            showAddressInDirectory: false,
          },
        },
        userAccount: {
          create: {
            id: `user-${player.id}`,
            email: player.email,
            passwordHash,
            status: AccountStatus.ACTIVE,
            mustResetPassword: false,
          },
        },
      },
    });
    console.log(`✅ Adult Player ready: id="${player.id}", email="${player.email}" (${player.firstName} ${player.lastName})`);
  }

  // 5. Seed realistic sample active loans for interactive verification
  const bat1 = await prisma.equipmentItem.findUnique({ where: { assetTag: "BAT-2026-001" } });
  if (bat1) {
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 5);

    await prisma.equipmentLoan.upsert({
      where: { id: "seed-loan-adult-001" },
      update: {},
      create: {
        id: "seed-loan-adult-001",
        equipmentItemId: bat1.id,
        borrowerProfileId: "adult-player-001",
        issuedById: "coach001",
        quantity: 1,
        status: "ACTIVE",
        expectedReturnAt: returnDate,
        checkoutCondition: "GOOD",
        checkoutNotes: "Checked out for senior net practice and weekend fixture",
      },
    });

    await prisma.equipmentItem.update({
      where: { id: bat1.id },
      data: { status: "ON_LOAN", availableQuantity: 0 },
    });
    console.log(`🏏 Seeded active loan for Adult Player Vikram Sharma (Kookaburra Senior Bat)`);
  }

  const bat2 = await prisma.equipmentItem.findUnique({ where: { assetTag: "BAT-2026-002" } });
  if (bat2) {
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 6);

    await prisma.equipmentLoan.upsert({
      where: { id: "seed-loan-junior-001" },
      update: {},
      create: {
        id: "seed-loan-junior-001",
        equipmentItemId: bat2.id,
        borrowerProfileId: "junior-player001",
        issuedById: "coach001",
        quantity: 1,
        status: "ACTIVE",
        expectedReturnAt: returnDate,
        checkoutCondition: "GOOD",
        checkoutNotes: "Checked out for U13 practice under father's supervision",
      },
    });

    await prisma.equipmentItem.update({
      where: { id: bat2.id },
      data: { status: "ON_LOAN", availableQuantity: 0 },
    });
    console.log(`🏏 Seeded active loan for Minor Player Lucas Hansen (Gray-Nicolls Junior Bat)`);
  }

  const helmet1 = await prisma.equipmentItem.findUnique({ where: { assetTag: "HLM-2026-001" } });
  if (helmet1) {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 2); // 2 days ago = Overdue

    await prisma.equipmentLoan.upsert({
      where: { id: "seed-loan-adult-002" },
      update: {},
      create: {
        id: "seed-loan-adult-002",
        equipmentItemId: helmet1.id,
        borrowerProfileId: "adult-player-002",
        issuedById: "coach001",
        quantity: 1,
        status: "OVERDUE",
        expectedReturnAt: overdueDate,
        checkoutCondition: "GOOD",
        checkoutNotes: "Senior match helmet - past due date",
      },
    });

    await prisma.equipmentItem.update({
      where: { id: helmet1.id },
      data: { status: "ON_LOAN", availableQuantity: 0 },
    });
    console.log(`🏏 Seeded overdue loan for Christian Lindqvist (Masuri Helmet)`);
  }

  console.log(`\n🎉 User database seeding complete! All users can log in with:`);
  console.log(`   Password: ${SHARED_PASSWORD}`);
  console.log(`   Identifier: Can use either ID (e.g. "parent001") or Email (e.g. "parent001@roskildecricket.dk")\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed users failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
