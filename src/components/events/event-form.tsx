"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Shield,
  Trophy,
  Dumbbell,
  AlertTriangle,
  Package,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Users,
  UserPlus,
  Mail,
  Search,
  Sparkles,
  Check,
  CheckSquare,
  Square,
  X,
  Filter,
} from "lucide-react";
import {
  createScheduledEventAction,
  updateScheduledEventAction,
  checkFacilityConflictAction,
} from "@/modules/teams-matches/actions/event.actions";
import {
  EventType,
  MatchType,
  TrainingType,
} from "@prisma/client";
import { SquadItem, ClubPlayerItem, PlayerProfileItem } from "./new-event-tabs";

interface FacilityItem {
  id: string;
  name: string;
  facilityType: string;
  location?: string | null;
}

interface EquipmentLoanItem {
  id: string;
  equipmentItemName: string;
  assetTag?: string | null;
  expectedReturnAt: string;
}

interface EventFormProps {
  squads: SquadItem[];
  facilities: FacilityItem[];
  equipmentLoans?: EquipmentLoanItem[];
  allClubPlayers?: ClubPlayerItem[];
  isAdmin: boolean;
  initialEvent?: {
    id: string;
    teamSquadId: string;
    facilityId: string | null;
    eventType: EventType;
    matchType: MatchType | null;
    trainingType: TrainingType | null;
    title: string;
    date: string;
    meetAt: string | null;
    startAt: string;
    endAt: string;
    isHome: boolean;
    opponentName: string | null;
    venueName: string | null;
    venueAddress: string | null;
    rsvpDeadlineAt: string;
    targetLineupSize: number;
    scorecardUrl: string | null;
    linkedEquipmentLoanId: string | null;
    collisionOverrideReason: string | null;
  };
}

export function EventForm({
  squads,
  facilities,
  equipmentLoans = [],
  allClubPlayers = [],
  isAdmin,
  initialEvent,
}: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [teamSquadId, setTeamSquadId] = useState<string>(
    initialEvent?.teamSquadId || squads[0]?.id || ""
  );
  const [eventType, setEventType] = useState<EventType>(
    initialEvent?.eventType || "MATCH"
  );
  const [matchType, setMatchType] = useState<MatchType>(
    initialEvent?.matchType || "LEAGUE"
  );
  const [trainingType, setTrainingType] = useState<TrainingType>(
    initialEvent?.trainingType || "NET_PRACTICE"
  );
  const [title, setTitle] = useState<string>(initialEvent?.title || "");
  const [isCustomTitle, setIsCustomTitle] = useState<boolean>(Boolean(initialEvent));

  const [dateStr, setDateStr] = useState<string>(
    initialEvent
      ? new Date(initialEvent.date).toISOString().split("T")[0]
      : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [startTimeStr, setStartTimeStr] = useState<string>(
    initialEvent
      ? new Date(initialEvent.startAt).toTimeString().substring(0, 5)
      : "10:00"
  );
  const [endTimeStr, setEndTimeStr] = useState<string>(
    initialEvent
      ? new Date(initialEvent.endAt).toTimeString().substring(0, 5)
      : "14:00"
  );
  const [meetTimeStr, setMeetTimeStr] = useState<string>(
    initialEvent?.meetAt
      ? new Date(initialEvent.meetAt).toTimeString().substring(0, 5)
      : "09:15"
  );

  const [isHome, setIsHome] = useState<boolean>(initialEvent ? initialEvent.isHome : true);
  const [facilityId, setFacilityId] = useState<string>(
    initialEvent?.facilityId || (isHome && facilities[0]?.id ? facilities[0].id : "")
  );
  const [opponentName, setOpponentName] = useState<string>(
    initialEvent?.opponentName || ""
  );
  const [venueName, setVenueName] = useState<string>(
    initialEvent?.venueName || ""
  );
  const [venueAddress, setVenueAddress] = useState<string>(
    initialEvent?.venueAddress || ""
  );

  // RSVP deadline defaults to 24h before start
  const [rsvpDaysBefore, setRsvpDaysBefore] = useState<number>(2);

  const selectedSquad = squads.find((s) => s.id === teamSquadId);
  const [targetLineupSize, setTargetLineupSize] = useState<number>(
    initialEvent?.targetLineupSize || selectedSquad?.defaultLineupSize || 11
  );

  const [scorecardUrl, setScorecardUrl] = useState<string>(
    initialEvent?.scorecardUrl || ""
  );
  const [linkedEquipmentLoanId, setLinkedEquipmentLoanId] = useState<string>(
    initialEvent?.linkedEquipmentLoanId || ""
  );

  // Participant & RSVP Invitation state
  const [participantPreset, setParticipantPreset] = useState<
    "ALL_SQUAD" | "BATSMEN" | "BOWLERS" | "WICKETKEEPERS" | "CUSTOM"
  >("ALL_SQUAD");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [additionalGuestPlayers, setAdditionalGuestPlayers] = useState<PlayerProfileItem[]>([]);
  const [notifyParticipants, setNotifyParticipants] = useState<boolean>(true);
  const [isGuestPickerOpen, setIsGuestPickerOpen] = useState<boolean>(false);
  const [guestSearch, setGuestSearch] = useState<string>("");

  const currentRoster = selectedSquad?.roster || [];

  function isBatsman(p: PlayerProfileItem): boolean {
    if (p.battingPosition && p.battingPosition !== "TAILENDER") return true;
    if (p.secondaryRoles?.includes("ALL_ROUNDER")) return true;
    return false;
  }

  function isBowler(p: PlayerProfileItem): boolean {
    if (p.bowlingStyle && p.bowlingStyle !== "DOES_NOT_BOWL") return true;
    if (p.secondaryRoles?.includes("ALL_ROUNDER")) return true;
    return false;
  }

  function isWicketkeeper(p: PlayerProfileItem): boolean {
    return Boolean(p.secondaryRoles?.includes("WICKETKEEPER"));
  }

  const batsmenCount = currentRoster.filter((r) => isBatsman(r.memberProfile)).length;
  const bowlersCount = currentRoster.filter((r) => isBowler(r.memberProfile)).length;
  const wkCount = currentRoster.filter((r) => isWicketkeeper(r.memberProfile)).length;

  function applyPreset(preset: "ALL_SQUAD" | "BATSMEN" | "BOWLERS" | "WICKETKEEPERS") {
    setParticipantPreset(preset);
    const guestIds = additionalGuestPlayers.map((g) => g.id);
    if (preset === "ALL_SQUAD") {
      const allIds = currentRoster.map((r) => r.memberProfile.id);
      setSelectedParticipantIds(
        Array.from(new Set([...allIds, ...guestIds]))
      );
    } else if (preset === "BATSMEN") {
      const bIds = currentRoster
        .filter((r) => isBatsman(r.memberProfile))
        .map((r) => r.memberProfile.id);
      setSelectedParticipantIds(
        bIds.length > 0
          ? Array.from(new Set([...bIds, ...guestIds]))
          : currentRoster.map((r) => r.memberProfile.id)
      );
    } else if (preset === "BOWLERS") {
      const bwIds = currentRoster
        .filter((r) => isBowler(r.memberProfile))
        .map((r) => r.memberProfile.id);
      setSelectedParticipantIds(
        bwIds.length > 0
          ? Array.from(new Set([...bwIds, ...guestIds]))
          : currentRoster.map((r) => r.memberProfile.id)
      );
    } else if (preset === "WICKETKEEPERS") {
      const wkIds = currentRoster
        .filter((r) => isWicketkeeper(r.memberProfile))
        .map((r) => r.memberProfile.id);
      setSelectedParticipantIds(
        wkIds.length > 0
          ? Array.from(new Set([...wkIds, ...guestIds]))
          : currentRoster.map((r) => r.memberProfile.id)
      );
    }
  }

  // Auto-sync roster members when squad changes
  useEffect(() => {
    if (!initialEvent && selectedSquad) {
      applyPreset("ALL_SQUAD");
    }
  }, [teamSquadId, selectedSquad]);

  function toggleParticipant(id: string) {
    setParticipantPreset("CUSTOM");
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  }

  function selectAllRoster() {
    setParticipantPreset("ALL_SQUAD");
    const allIds = [
      ...currentRoster.map((r) => r.memberProfile.id),
      ...additionalGuestPlayers.map((g) => g.id),
    ];
    setSelectedParticipantIds(Array.from(new Set(allIds)));
  }

  function deselectAllRoster() {
    setParticipantPreset("CUSTOM");
    setSelectedParticipantIds([]);
  }

  function addGuestPlayer(player: ClubPlayerItem) {
    if (!additionalGuestPlayers.some((g) => g.id === player.id)) {
      setAdditionalGuestPlayers((prev) => [...prev, player]);
      setSelectedParticipantIds((prev) => Array.from(new Set([...prev, player.id])));
    }
    setGuestSearch("");
    setIsGuestPickerOpen(false);
  }

  function removeGuestPlayer(id: string) {
    setAdditionalGuestPlayers((prev) => prev.filter((g) => g.id !== id));
    setSelectedParticipantIds((prev) => prev.filter((pId) => pId !== id));
  }

  const availableGuests = allClubPlayers.filter((p) => {
    if (currentRoster.some((r) => r.memberProfile.id === p.id)) return false;
    if (additionalGuestPlayers.some((g) => g.id === p.id)) return false;
    if (guestSearch.trim()) {
      const q = guestSearch.toLowerCase();
      return (
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Conflict state
  const [collisionDetected, setCollisionDetected] = useState<boolean>(false);
  const [conflictingEvent, setConflictingEvent] = useState<any>(null);
  const [collisionReasonMsg, setCollisionReasonMsg] = useState<string>("");
  const [collisionOverrideReason, setCollisionOverrideReason] = useState<string>(
    initialEvent?.collisionOverrideReason || ""
  );

  const [errorMsg, setErrorMsg] = useState<string>("");

  // Sync defaultLineupSize when squad changes
  useEffect(() => {
    if (!initialEvent && selectedSquad) {
      setTargetLineupSize(selectedSquad.defaultLineupSize);
    }
  }, [teamSquadId, selectedSquad, initialEvent]);

  // Auto-generate suggested title if user hasn't explicitly customized it
  useEffect(() => {
    if (isCustomTitle) return;
    const squadName = selectedSquad?.name || "Roskilde CC";
    if (eventType === "MATCH") {
      const opp = opponentName.trim() || "TBD";
      setTitle(`${squadName} vs ${opp}`);
    } else {
      const trainLabel =
        trainingType === "NET_PRACTICE"
          ? "Net Practice"
          : trainingType === "FIELDING_FITNESS"
          ? "Fielding & Fitness"
          : trainingType === "INDOOR_WINTER"
          ? "Indoor Winter Training"
          : "Open Nets";
      setTitle(`${squadName} ${trainLabel}`);
    }
  }, [eventType, matchType, trainingType, opponentName, selectedSquad, isCustomTitle]);

  // When isHome flips to true, pick first facility if none selected
  useEffect(() => {
    if (isHome && !facilityId && facilities.length > 0) {
      setFacilityId(facilities[0].id);
    }
  }, [isHome, facilityId, facilities]);

  // Pre-flight Conflict Check
  useEffect(() => {
    if (!facilityId || !dateStr || !startTimeStr || !endTimeStr) {
      setCollisionDetected(false);
      setConflictingEvent(null);
      setCollisionReasonMsg("");
      return;
    }

    const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
    const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`);

    if (startDateTime.getTime() >= endDateTime.getTime()) {
      return;
    }

    let isSubscribed = true;

    async function checkConflict() {
      const res = await checkFacilityConflictAction({
        facilityId,
        startAt: startDateTime.toISOString(),
        endAt: endDateTime.toISOString(),
        excludeEventId: initialEvent?.id,
      });

      if (!isSubscribed) return;

      if (res.success && res.data) {
        if (res.data.hasConflict) {
          setCollisionDetected(true);
          setConflictingEvent(res.data.conflictingEvent);
          setCollisionReasonMsg(res.data.reason);
        } else {
          setCollisionDetected(false);
          setConflictingEvent(null);
          setCollisionReasonMsg("");
        }
      }
    }

    const timer = setTimeout(checkConflict, 400);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [facilityId, dateStr, startTimeStr, endTimeStr, initialEvent?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
    const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`);

    if (startDateTime.getTime() >= endDateTime.getTime()) {
      setErrorMsg("End time must be later than start time.");
      return;
    }

    const meetDateTime = meetTimeStr
      ? new Date(`${dateStr}T${meetTimeStr}:00`).toISOString()
      : null;

    // Calculate RSVP deadline
    const deadlineDateTime = new Date(
      startDateTime.getTime() - rsvpDaysBefore * 24 * 60 * 60 * 1000
    );

    if (collisionDetected && !isAdmin) {
      setErrorMsg(
        "Regular coaches cannot override facility collisions. Please choose an open facility or time slot."
      );
      return;
    }

    if (collisionDetected && isAdmin && collisionOverrideReason.trim().length < 5) {
      setErrorMsg(
        "Administrators must provide a collision override rationale (minimum 5 characters) to proceed."
      );
      return;
    }

    startTransition(async () => {
      const payload: any = {
        teamSquadId,
        facilityId: isHome && facilityId ? facilityId : null,
        eventType,
        matchType: eventType === "MATCH" ? matchType : null,
        trainingType: eventType === "TRAINING" ? trainingType : null,
        title,
        date: new Date(`${dateStr}T00:00:00`).toISOString(),
        meetAt: meetDateTime,
        startAt: startDateTime.toISOString(),
        endAt: endDateTime.toISOString(),
        isHome,
        opponentName: eventType === "MATCH" ? opponentName.trim() || null : null,
        venueName: isHome
          ? facilities.find((f) => f.id === facilityId)?.name || null
          : venueName.trim() || null,
        venueAddress: !isHome ? venueAddress.trim() || null : null,
        rsvpDeadlineAt: deadlineDateTime.toISOString(),
        targetLineupSize,
        scorecardUrl: scorecardUrl.trim() || null,
        linkedEquipmentLoanId: linkedEquipmentLoanId || null,
        collisionOverrideReason:
          collisionDetected && isAdmin ? collisionOverrideReason.trim() : null,
        participantFilter: participantPreset,
        invitedMemberIds: selectedParticipantIds,
        notifyParticipants,
      };

      if (initialEvent) {
        const res = await updateScheduledEventAction({
          id: initialEvent.id,
          ...payload,
        });

        if (res.success) {
          router.push(`/events/${initialEvent.id}`);
        } else {
          setErrorMsg(res.error || "Failed to update event.");
        }
      } else {
        const res = await createScheduledEventAction(payload);
        if (res.success && res.data) {
          router.push(`/events/${(res.data as any).id}`);
        } else {
          setErrorMsg(res.error || "Failed to schedule event.");
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error scheduling event</p>
            <p className="text-xs text-red-300 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Real-time Collision Banner */}
      {collisionDetected && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-200 space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-amber-300">
                Facility Booking Collision Detected!
              </p>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {collisionReasonMsg}
              </p>
            </div>
          </div>

          {!isAdmin ? (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-300">
              Coaches cannot override facility collisions. Please adjust the event time or select an alternate club ground/net.
            </div>
          ) : (
            <div className="pt-2 border-t border-amber-900/50 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                Administrator Collision Override Rationale (Mandatory)
              </label>
              <textarea
                value={collisionOverrideReason}
                onChange={(e) => setCollisionOverrideReason(e.target.value)}
                placeholder="State the audit rationale for double-booking this facility (min 5 characters)..."
                rows={2}
                className="w-full bg-slate-950 border border-amber-800/80 rounded-xl p-2.5 text-xs text-white placeholder-amber-400/50 focus:outline-none focus:border-amber-400"
              />
              <p className="text-[10px] text-amber-400/80">
                This rationale will be permanently recorded in the facility audit log alongside your administrator ID.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 1. Squad & Type Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-400" />
          Squad &amp; Event Classification
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Assigned Club Squad <span className="text-red-400">*</span>
            </label>
            <select
              value={teamSquadId}
              onChange={(e) => setTeamSquadId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {squads.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category} • Lineup: {s.defaultLineupSize})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Event Classification <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEventType("MATCH")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  eventType === "MATCH"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Trophy className="w-4 h-4" />
                Match Fixture
              </button>
              <button
                type="button"
                onClick={() => setEventType("TRAINING")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  eventType === "TRAINING"
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Dumbbell className="w-4 h-4" />
                Training Session
              </button>
            </div>
          </div>
        </div>

        {/* Sub-type details */}
        {eventType === "MATCH" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Match Competition Type
              </label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as MatchType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="LEAGUE">DCF League Match</option>
                <option value="FRIENDLY">Friendly Fixture</option>
                <option value="CUP">Cup Competition</option>
                <option value="TOURNAMENT">Tournament Match</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Venue Location
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsHome(true)}
                  className={`py-2 px-2 rounded-xl border text-xs font-semibold ${
                    isHome
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  Home (Club Ground)
                </button>
                <button
                  type="button"
                  onClick={() => setIsHome(false)}
                  className={`py-2 px-2 rounded-xl border text-xs font-semibold ${
                    !isHome
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  Away Match
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Opponent Club / Team
              </label>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="e.g. Copenhagen CC, Svanholm"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Training Focus
              </label>
              <select
                value={trainingType}
                onChange={(e) => setTrainingType(e.target.value as TrainingType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="NET_PRACTICE">Net Practice</option>
                <option value="FIELDING_FITNESS">Fielding &amp; Fitness</option>
                <option value="INDOOR_WINTER">Indoor Winter Training</option>
                <option value="OPEN_NETS">Open Net Session</option>
              </select>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="pt-2">
          <label className="text-xs font-medium text-slate-300 block mb-1.5">
            Event Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsCustomTitle(true);
            }}
            placeholder="Event title..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            required
          />
        </div>
      </div>

      {/* 2. Date, Time & Facility */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Schedule &amp; Ground Allocation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Event Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Meet Time
            </label>
            <input
              type="time"
              value={meetTimeStr}
              onChange={(e) => setMeetTimeStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Start Time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              End Time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>
        </div>

        {/* Facility Picker */}
        <div className="pt-2 border-t border-slate-800/80">
          {isHome ? (
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Club Facility / Ground Reserved <span className="text-red-400">*</span>
              </label>
              <select
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">No facility reserved (external)</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.facilityType}) {f.location ? `• ${f.location}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Away Ground / Venue Name
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Svanholm Park, Albertslund"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Venue Street Address
                </label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="e.g. Stadionvej 10, 2620 Albertslund"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Eligible Participants & RSVP Invitations */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Eligible Participants &amp; RSVP Invitations
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select which squad players (or specialized groups) receive notification invitations and can submit availability RSVPs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-950/80 border border-sky-800 text-sky-300">
              {selectedParticipantIds.length} Invited
            </span>
          </div>
        </div>

        {/* Quick Filter Presets */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            type="button"
            onClick={() => applyPreset("ALL_SQUAD")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              participantPreset === "ALL_SQUAD"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            All Squad ({currentRoster.length})
          </button>

          <button
            type="button"
            onClick={() => applyPreset("BATSMEN")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              participantPreset === "BATSMEN"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Special Batting Session ({batsmenCount})
          </button>

          <button
            type="button"
            onClick={() => applyPreset("BOWLERS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              participantPreset === "BOWLERS"
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Special Bowling Session ({bowlersCount})
          </button>

          {wkCount > 0 && (
            <button
              type="button"
              onClick={() => applyPreset("WICKETKEEPERS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                participantPreset === "WICKETKEEPERS"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                  : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
              }`}
            >
              🧤 Wicketkeepers ({wkCount})
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllRoster}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300"
            >
              Select All
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={deselectAllRoster}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-300"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Squad Roster Members Checklist */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 max-h-64 overflow-y-auto space-y-1.5">
          {currentRoster.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              No active players rostered in this squad. Use the button below to add players.
            </p>
          ) : (
            currentRoster.map((r) => {
              const p = r.memberProfile;
              const isSelected = selectedParticipantIds.includes(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => toggleParticipant(p.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-sky-500/10 border-sky-500/30 text-white"
                      : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-sky-500 border-sky-500 text-white"
                          : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>

                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {p.firstName[0]}
                      {p.lastName[0]}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {p.firstName} {p.lastName}
                        </span>
                        {r.jerseyNumber && (
                          <span className="text-[10px] font-mono text-slate-400">
                            #{r.jerseyNumber}
                          </span>
                        )}
                        {r.rosterRole && r.rosterRole !== "PLAYER" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-semibold">
                            {r.rosterRole}
                          </span>
                        )}
                      </div>

                      {/* Attribute Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {p.battingPosition && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                            {p.battingPosition}
                          </span>
                        )}
                        {p.bowlingStyle && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950/70 text-indigo-400 border border-indigo-800/60">
                            {p.bowlingStyle}
                          </span>
                        )}
                        {p.secondaryRoles?.map((sr) => (
                          <span
                            key={sr}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/70 text-purple-400 border border-purple-800/60"
                          >
                            {sr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {p.dateOfBirth && (
                      <span className="text-[10px] text-slate-500">
                        b. {new Date(p.dateOfBirth).getFullYear()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Additional Guest / Call-Up Players */}
        {additionalGuestPlayers.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Called Up / Guest Participants from Other Squads ({additionalGuestPlayers.length})
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              {additionalGuestPlayers.map((g) => (
                <span
                  key={g.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200"
                >
                  <span className="font-semibold">{g.firstName} {g.lastName}</span>
                  <button
                    type="button"
                    onClick={() => removeGuestPlayer(g.id)}
                    className="p-0.5 hover:text-red-400 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Call Up Other Players Button & Search Dropdown */}
        <div className="relative pt-1">
          <button
            type="button"
            onClick={() => setIsGuestPickerOpen(!isGuestPickerOpen)}
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Call up / Invite Player from Another Squad
          </button>

          {isGuestPickerOpen && (
            <div className="absolute z-20 left-0 mt-2 w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow-2xl space-y-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search club players by name..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableGuests.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">
                    No matching club players found.
                  </p>
                ) : (
                  availableGuests.slice(0, 10).map((player) => (
                    <div
                      key={player.id}
                      onClick={() => addGuestPlayer(player)}
                      className="p-2 rounded-lg hover:bg-slate-900 flex items-center justify-between cursor-pointer text-xs"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {player.rosterMemberships && player.rosterMemberships.length > 0
                            ? player.rosterMemberships.map((m) => m.teamSquad.name).join(", ")
                            : "General Pool"}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-semibold">
                        Add &rarr;
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Email Notification Option */}
        <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2.5">
          <input
            type="checkbox"
            id="notifyParticipants"
            checked={notifyParticipants}
            onChange={(e) => setNotifyParticipants(e.target.checked)}
            className="mt-0.5 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
          />
          <label htmlFor="notifyParticipants" className="text-xs text-slate-300 leading-normal cursor-pointer">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              Send email notifications with 1-tap RSVP button
            </span>
            <span className="text-slate-400 block text-[11px] mt-0.5">
              All selected participants (or linked parents for youth players) will immediately receive match/training details and an instant RSVP link.
            </span>
          </label>
        </div>
      </div>

      {/* 4. Availability RSVP & Matchday Config */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          RSVP Cutoff &amp; Matchday Lineup
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Self-Service RSVP Cutoff
            </label>
            <select
              value={rsvpDaysBefore}
              onChange={(e) => setRsvpDaysBefore(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value={1}>24 hours before event</option>
              <option value={2}>48 hours before event</option>
              <option value={3}>3 days before event</option>
              <option value={5}>5 days before event</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              After this deadline, players cannot change status; coaches retain pitch-side edit access.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Target Starting Lineup Size
            </label>
            <input
              type="number"
              min={6}
              max={15}
              value={targetLineupSize}
              onChange={(e) => setTargetLineupSize(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              11 for senior DCF league; 8–12 for youth / friendlies.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Live Scorecard URL (Optional)
            </label>
            <input
              type="url"
              value={scorecardUrl}
              onChange={(e) => setScorecardUrl(e.target.value)}
              placeholder="https://cricheroes.in/... or DCF link"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Module 2 Equipment Kit Bag Link */}
        {equipmentLoans.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80">
            <label className="text-xs font-medium text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-400" />
              Link Equipment Kit Bag / Match Balls (Module 2 Integration)
            </label>
            <select
              value={linkedEquipmentLoanId}
              onChange={(e) => setLinkedEquipmentLoanId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">No equipment kit linked</option>
              {equipmentLoans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.equipmentItemName} {loan.assetTag ? `[#${loan.assetTag}]` : ""} • Return Due:{" "}
                  {new Date(loan.expectedReturnAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Submit / Cancel Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isPending || (collisionDetected && !isAdmin)}
          className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-[0.98] ${
            collisionDetected && !isAdmin
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-950/40"
          }`}
        >
          {isPending
            ? "Saving Event..."
            : initialEvent
            ? "Save Changes"
            : collisionDetected && isAdmin
            ? "Confirm & Override Collision"
            : "Schedule Event"}
        </button>
      </div>
    </form>
  );
}
