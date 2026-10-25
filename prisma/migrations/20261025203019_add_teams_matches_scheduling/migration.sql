-- CreateEnum
CREATE TYPE "SquadCategory" AS ENUM ('SENIOR', 'YOUTH', 'SOCIAL');

-- CreateEnum
CREATE TYPE "SquadStaffRole" AS ENUM ('HEAD_COACH', 'ASSISTANT_COACH', 'AD_HOC_COACH');

-- CreateEnum
CREATE TYPE "RosterRole" AS ENUM ('PLAYER', 'CAPTAIN', 'VICE_CAPTAIN');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('MAIN_PITCH', 'PRACTICE_NETS', 'INDOOR_HALL', 'CLUBHOUSE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MATCH', 'TRAINING');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('LEAGUE', 'FRIENDLY', 'CUP', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('NET_PRACTICE', 'FIELDING_FITNESS', 'INDOOR_WINTER', 'OPEN_NETS');

-- CreateEnum
CREATE TYPE "EventLifecycleStatus" AS ENUM ('SCHEDULED', 'PLAYED', 'RAINED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('NO_RESPONSE', 'AVAILABLE', 'UNAVAILABLE', 'MAYBE');

-- CreateEnum
CREATE TYPE "SelectionPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "LineupSlot" AS ENUM ('STARTING', 'SUBSTITUTE', 'RESERVE');

-- CreateEnum
CREATE TYPE "MatchTacticalRole" AS ENUM ('PLAYER', 'CAPTAIN', 'VICE_CAPTAIN', 'WICKETKEEPER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT_EXCUSED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "TeamSquad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SquadCategory" NOT NULL,
    "ageGroupRule" TEXT,
    "defaultLineupSize" INTEGER NOT NULL DEFAULT 11,
    "genderGroup" TEXT NOT NULL DEFAULT 'MIXED',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSquad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCoachAssignment" (
    "id" TEXT NOT NULL,
    "teamSquadId" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "role" "SquadStaffRole" NOT NULL DEFAULT 'HEAD_COACH',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamCoachAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRosterMember" (
    "id" TEXT NOT NULL,
    "teamSquadId" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "rosterRole" "RosterRole" NOT NULL DEFAULT 'PLAYER',
    "jerseyNumber" INTEGER,
    "hasDispensation" BOOLEAN NOT NULL DEFAULT false,
    "dispensationNotes" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeamRosterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubFacility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityType" "FacilityType" NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledEvent" (
    "id" TEXT NOT NULL,
    "teamSquadId" TEXT NOT NULL,
    "facilityId" TEXT,
    "eventType" "EventType" NOT NULL,
    "matchType" "MatchType",
    "trainingType" "TrainingType",
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "meetAt" TIMESTAMP(3),
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT true,
    "opponentName" TEXT,
    "venueName" TEXT,
    "venueAddress" TEXT,
    "rsvpDeadlineAt" TIMESTAMP(3) NOT NULL,
    "targetLineupSize" INTEGER NOT NULL DEFAULT 11,
    "lifecycleStatus" "EventLifecycleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scorecardUrl" TEXT,
    "collisionOverrideById" TEXT,
    "collisionOverrideReason" TEXT,
    "collisionOverrideAt" TIMESTAMP(3),
    "linkedEquipmentLoanId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRsvp" (
    "id" TEXT NOT NULL,
    "scheduledEventId" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL DEFAULT 'NO_RESPONSE',
    "transportNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSelection" (
    "id" TEXT NOT NULL,
    "scheduledEventId" TEXT NOT NULL,
    "selectionStatus" "SelectionPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "targetLineupSize" INTEGER NOT NULL DEFAULT 11,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSelectionPlayer" (
    "id" TEXT NOT NULL,
    "matchSelectionId" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "selectionRole" "LineupSlot" NOT NULL DEFAULT 'STARTING',
    "tacticalRole" "MatchTacticalRole" NOT NULL DEFAULT 'PLAYER',
    "battingOrderPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchSelectionPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAttendance" (
    "id" TEXT NOT NULL,
    "scheduledEventId" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "arrivalTime" TIMESTAMP(3),
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamSquad_name_key" ON "TeamSquad"("name");

-- CreateIndex
CREATE INDEX "TeamSquad_category_isActive_idx" ON "TeamSquad"("category", "isActive");

-- CreateIndex
CREATE INDEX "TeamCoachAssignment_coachProfileId_idx" ON "TeamCoachAssignment"("coachProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamCoachAssignment_teamSquadId_coachProfileId_key" ON "TeamCoachAssignment"("teamSquadId", "coachProfileId");

-- CreateIndex
CREATE INDEX "TeamRosterMember_memberProfileId_isActive_idx" ON "TeamRosterMember"("memberProfileId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TeamRosterMember_teamSquadId_memberProfileId_key" ON "TeamRosterMember"("teamSquadId", "memberProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubFacility_name_key" ON "ClubFacility"("name");

-- CreateIndex
CREATE INDEX "ClubFacility_facilityType_isActive_idx" ON "ClubFacility"("facilityType", "isActive");

-- CreateIndex
CREATE INDEX "ScheduledEvent_facilityId_startAt_endAt_idx" ON "ScheduledEvent"("facilityId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ScheduledEvent_teamSquadId_date_idx" ON "ScheduledEvent"("teamSquadId", "date");

-- CreateIndex
CREATE INDEX "ScheduledEvent_startAt_lifecycleStatus_idx" ON "ScheduledEvent"("startAt", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "EventRsvp_memberProfileId_status_idx" ON "EventRsvp"("memberProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventRsvp_scheduledEventId_memberProfileId_key" ON "EventRsvp"("scheduledEventId", "memberProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSelection_scheduledEventId_key" ON "MatchSelection"("scheduledEventId");

-- CreateIndex
CREATE INDEX "MatchSelection_selectionStatus_idx" ON "MatchSelection"("selectionStatus");

-- CreateIndex
CREATE INDEX "MatchSelectionPlayer_memberProfileId_idx" ON "MatchSelectionPlayer"("memberProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSelectionPlayer_matchSelectionId_memberProfileId_key" ON "MatchSelectionPlayer"("matchSelectionId", "memberProfileId");

-- CreateIndex
CREATE INDEX "EventAttendance_memberProfileId_status_idx" ON "EventAttendance"("memberProfileId", "status");

-- CreateIndex
CREATE INDEX "EventAttendance_scheduledEventId_isLocked_idx" ON "EventAttendance"("scheduledEventId", "isLocked");

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendance_scheduledEventId_memberProfileId_key" ON "EventAttendance"("scheduledEventId", "memberProfileId");

-- AddForeignKey
ALTER TABLE "TeamCoachAssignment" ADD CONSTRAINT "TeamCoachAssignment_teamSquadId_fkey" FOREIGN KEY ("teamSquadId") REFERENCES "TeamSquad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCoachAssignment" ADD CONSTRAINT "TeamCoachAssignment_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRosterMember" ADD CONSTRAINT "TeamRosterMember_teamSquadId_fkey" FOREIGN KEY ("teamSquadId") REFERENCES "TeamSquad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRosterMember" ADD CONSTRAINT "TeamRosterMember_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEvent" ADD CONSTRAINT "ScheduledEvent_teamSquadId_fkey" FOREIGN KEY ("teamSquadId") REFERENCES "TeamSquad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEvent" ADD CONSTRAINT "ScheduledEvent_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "ClubFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEvent" ADD CONSTRAINT "ScheduledEvent_collisionOverrideById_fkey" FOREIGN KEY ("collisionOverrideById") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEvent" ADD CONSTRAINT "ScheduledEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEvent" ADD CONSTRAINT "ScheduledEvent_linkedEquipmentLoanId_fkey" FOREIGN KEY ("linkedEquipmentLoanId") REFERENCES "EquipmentLoan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_scheduledEventId_fkey" FOREIGN KEY ("scheduledEventId") REFERENCES "ScheduledEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSelection" ADD CONSTRAINT "MatchSelection_scheduledEventId_fkey" FOREIGN KEY ("scheduledEventId") REFERENCES "ScheduledEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSelection" ADD CONSTRAINT "MatchSelection_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSelectionPlayer" ADD CONSTRAINT "MatchSelectionPlayer_matchSelectionId_fkey" FOREIGN KEY ("matchSelectionId") REFERENCES "MatchSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSelectionPlayer" ADD CONSTRAINT "MatchSelectionPlayer_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_scheduledEventId_fkey" FOREIGN KEY ("scheduledEventId") REFERENCES "ScheduledEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
