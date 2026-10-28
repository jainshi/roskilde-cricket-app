import React from "react";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { prisma } from "@/lib/db";
import { getMemberAnnouncements } from "@/modules/communications/services/announcement.service";
import { NoticeboardClient } from "@/components/communications/noticeboard-client";

export const metadata = {
  title: "Noticeboard & Announcements | Roskilde Cricket Club",
  description:
    "Official club announcements, emergency pitch/weather alerts, squad communications, and AGM notices.",
};

export default async function CommunicationsPage() {
  const session = await requireActivatedSession();
  const targetProfileId = session.activeProfileId || session.memberProfileId;
  const isAdminOrCoach =
    session.roles.includes("ADMIN") || session.roles.includes("COACH");

  const [announcements, squads] = await Promise.all([
    getMemberAnnouncements(targetProfileId),
    isAdminOrCoach
      ? prisma.teamSquad.findMany({
          select: {
            id: true,
            name: true,
            category: true,
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <NoticeboardClient
        announcements={announcements}
        currentProfileId={targetProfileId}
        isAdminOrCoach={isAdminOrCoach}
        squads={squads}
      />
    </div>
  );
}
