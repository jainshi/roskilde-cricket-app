import React from "react";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  getUpcomingVolunteerRoster,
  getMyVolunteerDuties,
} from "@/modules/volunteers/services/volunteer.service";
import { VolunteerHub } from "@/components/volunteers/volunteer-hub";

export const metadata = {
  title: "Volunteer Duty Roster | Roskilde Cricket Club",
  description:
    "Match-day operations, officiating, scoring, ground preparation, tea catering, and junior carpool volunteer roster.",
};

export default async function VolunteersPage() {
  const session = await requireActivatedSession();
  const targetProfileId = session.activeProfileId || session.memberProfileId;
  const isStaff =
    session.roles.includes("ADMIN") ||
    session.roles.includes("COACH") ||
    session.roles.includes("AD_HOC_COACH");

  const [{ slots: allUpcomingSlots, stats }, mySlots] = await Promise.all([
    getUpcomingVolunteerRoster(),
    getMyVolunteerDuties(targetProfileId, true),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <VolunteerHub
        allUpcomingSlots={allUpcomingSlots}
        mySlots={mySlots}
        stats={stats}
        currentProfileId={targetProfileId}
        isStaff={isStaff}
      />
    </div>
  );
}
