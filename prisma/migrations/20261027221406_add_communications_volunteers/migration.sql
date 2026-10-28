-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('GENERAL', 'SQUAD_UPDATE', 'WEATHER_ALERT', 'AGM', 'SOCIAL_EVENT');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'PINNED', 'URGENT_WEATHER_ALERT', 'AGM_NOTICE');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL_MEMBERS', 'SQUAD_SPECIFIC', 'ROLE_SPECIFIC');

-- CreateEnum
CREATE TYPE "VolunteerDutyType" AS ENUM ('SCORING', 'UMPIRING', 'PITCH_PREPARATION', 'TEA_CATERING', 'YOUTH_CARPOOL', 'GENERAL_VOLUNTEER');

-- CreateEnum
CREATE TYPE "VolunteerSlotStatus" AS ENUM ('OPEN', 'CLAIMED', 'SWAP_REQUESTED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('BYLAWS', 'CHILD_SAFETY', 'CODE_OF_CONDUCT', 'GENERAL_POLICY');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL DEFAULT 'GENERAL',
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL_MEMBERS',
    "targetSquadId" TEXT,
    "targetRole" "Role",
    "linkedEventId" TEXT,
    "authorProfileId" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementReadReceipt" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerDutySlot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "dutyType" "VolunteerDutyType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "VolunteerSlotStatus" NOT NULL DEFAULT 'OPEN',
    "assignedProfileId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "swapRequestedAt" TIMESTAMP(3),
    "swapReason" TEXT,
    "carpoolSeats" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerDutySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "version" TEXT NOT NULL,
    "fileUrl" TEXT,
    "contentMarkdown" TEXT,
    "requiresSignOff" BOOLEAN NOT NULL DEFAULT false,
    "targetRole" "Role",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSignOff" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "versionSigned" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "DocumentSignOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Announcement_slug_key" ON "Announcement"("slug");

-- CreateIndex
CREATE INDEX "Announcement_category_priority_idx" ON "Announcement"("category", "priority");

-- CreateIndex
CREATE INDEX "Announcement_targetSquadId_idx" ON "Announcement"("targetSquadId");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- CreateIndex
CREATE INDEX "Announcement_isPinned_idx" ON "Announcement"("isPinned");

-- CreateIndex
CREATE INDEX "AnnouncementReadReceipt_memberProfileId_idx" ON "AnnouncementReadReceipt"("memberProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementReadReceipt_announcementId_memberProfileId_key" ON "AnnouncementReadReceipt"("announcementId", "memberProfileId");

-- CreateIndex
CREATE INDEX "VolunteerDutySlot_eventId_status_idx" ON "VolunteerDutySlot"("eventId", "status");

-- CreateIndex
CREATE INDEX "VolunteerDutySlot_assignedProfileId_status_idx" ON "VolunteerDutySlot"("assignedProfileId", "status");

-- CreateIndex
CREATE INDEX "VolunteerDutySlot_dutyType_idx" ON "VolunteerDutySlot"("dutyType");

-- CreateIndex
CREATE UNIQUE INDEX "ClubDocument_slug_key" ON "ClubDocument"("slug");

-- CreateIndex
CREATE INDEX "ClubDocument_category_isActive_idx" ON "ClubDocument"("category", "isActive");

-- CreateIndex
CREATE INDEX "ClubDocument_requiresSignOff_idx" ON "ClubDocument"("requiresSignOff");

-- CreateIndex
CREATE INDEX "DocumentSignOff_memberProfileId_idx" ON "DocumentSignOff"("memberProfileId");

-- CreateIndex
CREATE INDEX "DocumentSignOff_documentId_idx" ON "DocumentSignOff"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSignOff_documentId_memberProfileId_versionSigned_key" ON "DocumentSignOff"("documentId", "memberProfileId", "versionSigned");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorProfileId_fkey" FOREIGN KEY ("authorProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_targetSquadId_fkey" FOREIGN KEY ("targetSquadId") REFERENCES "TeamSquad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_linkedEventId_fkey" FOREIGN KEY ("linkedEventId") REFERENCES "ScheduledEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementReadReceipt" ADD CONSTRAINT "AnnouncementReadReceipt_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementReadReceipt" ADD CONSTRAINT "AnnouncementReadReceipt_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerDutySlot" ADD CONSTRAINT "VolunteerDutySlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ScheduledEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerDutySlot" ADD CONSTRAINT "VolunteerDutySlot_assignedProfileId_fkey" FOREIGN KEY ("assignedProfileId") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignOff" ADD CONSTRAINT "DocumentSignOff_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ClubDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignOff" ADD CONSTRAINT "DocumentSignOff_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
