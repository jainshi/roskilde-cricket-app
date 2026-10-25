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
  console.log(`   - mustResetPassword: true`);
  console.log(`   - Expires at: ${tempExpiry.toISOString()}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
