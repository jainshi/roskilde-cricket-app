import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@roskildecricket.dk";
  const tempPassword = process.env.SEED_ADMIN_TEMP_PASSWORD || "RccAdm26";

  console.log(`\n🌱 Starting seed for default Super Admin...`);

  const existing = await prisma.userAccount.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`ℹ️ Admin user with email "${adminEmail}" already exists. Skipping.`);
    return;
  }

  const passwordHash = await argon2.hash(tempPassword, {
    type: argon2.argon2id,
  });

  const now = new Date();
  const tempExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const profile = await prisma.memberProfile.create({
    data: {
      firstName: "Super",
      lastName: "Administrator",
      email: adminEmail,
      phone: "+45 11 22 33 44",
      dateOfBirth: new Date("1985-01-01"),
      roleAssignments: {
        create: {
          role: "ADMIN",
        },
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
          email: adminEmail,
          passwordHash,
          status: "INVITED",
          mustResetPassword: true,
          temporaryPasswordExpiresAt: tempExpiry,
        },
      },
      actionsPerformed: {
        create: {
          action: "SUPER_ADMIN_SEEDED",
          metadata: { email: adminEmail },
        },
      },
    },
    include: {
      userAccount: true,
    },
  });

  console.log(`✅ Default Super Admin created successfully!`);
  console.log(`   - Profile ID: ${profile.id}`);
  console.log(`   - Email: ${adminEmail}`);
  console.log(`   - Temporary Password: ${tempPassword}`);

  // Seed Test Coach
  const coachEmail = "coach@roskildecricket.dk";
  const existingCoach = await prisma.userAccount.findUnique({ where: { email: coachEmail } });
  if (!existingCoach) {
    const coachHash = await argon2.hash("RccCoach26", { type: argon2.argon2id });
    await prisma.memberProfile.create({
      data: {
        firstName: "Henrik",
        lastName: "Mortensen",
        email: coachEmail,
        phone: "+45 22 33 44 55",
        dateOfBirth: new Date("1980-05-12"),
        roleAssignments: { create: { role: "COACH" } },
        battingPosition: "MIDDLE_ORDER",
        bowlingStyle: "RIGHT_ARM_MEDIUM",
        privacySettings: { create: { showEmailInDirectory: true, showPhoneInDirectory: true } },
        userAccount: {
          create: {
            email: coachEmail,
            passwordHash: coachHash,
            status: "ACTIVE",
            mustResetPassword: false,
          },
        },
      },
    });
    console.log(`✅ Test Coach created: ${coachEmail} / RccCoach26`);
  }

  // Seed Test Parent and Linked Youth Player
  const parentEmail = "parent@roskildecricket.dk";
  const existingParent = await prisma.userAccount.findUnique({ where: { email: parentEmail } });
  if (!existingParent) {
    const parentHash = await argon2.hash("RccParent26", { type: argon2.argon2id });
    const parentProfile = await prisma.memberProfile.create({
      data: {
        firstName: "Søren",
        lastName: "Hansen",
        email: parentEmail,
        phone: "+45 33 44 55 66",
        dateOfBirth: new Date("1983-09-20"),
        roleAssignments: { create: { role: "PARENT" } },
        privacySettings: { create: { showEmailInDirectory: false, showPhoneInDirectory: false } },
        userAccount: {
          create: {
            email: parentEmail,
            passwordHash: parentHash,
            status: "ACTIVE",
            mustResetPassword: false,
          },
        },
      },
    });

    // Create linked Youth Player (12 years old, no login account)
    const youthProfile = await prisma.memberProfile.create({
      data: {
        firstName: "Lucas",
        lastName: "Hansen",
        dateOfBirth: new Date("2014-04-10"),
        roleAssignments: { create: { role: "PLAYER" } },
        battingPosition: "TOP_ORDER",
        bowlingStyle: "RIGHT_ARM_FAST",
        shirtSize: "YOUTH_M",
        trouserSize: "YOUTH_M",
        capSize: "YOUTH_M",
        parentLinksAsPlayer: {
          create: {
            parentId: parentProfile.id,
            slot: 1,
            relationship: "Father",
          },
        },
        emergencyContacts: {
          create: {
            name: "Søren Hansen",
            relationship: "Father",
            phone: "+45 33 44 55 66",
            isPrimary: true,
          },
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
    console.log(`✅ Test Parent created: ${parentEmail} / RccParent26 with linked youth Lucas Hansen (ID: ${youthProfile.id})`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
