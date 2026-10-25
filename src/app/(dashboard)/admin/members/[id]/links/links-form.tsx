"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  addParentLinkAction,
  removeParentLinkAction,
  ParentLinkActionState,
} from "@/modules/auth-rbac/actions/parent-child.actions";
import {
  Users,
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  Info,
} from "lucide-react";

interface ParentItem {
  id: string;
  slot: number;
  relationship: string | null;
  parentId: string;
  parentName: string;
  parentEmail: string | null;
  parentPhone: string | null;
}

interface CandidateParent {
  id: string;
  name: string;
  email: string | null;
}

interface LinksFormProps {
  player: {
    id: string;
    name: string;
    dateOfBirth: string | null;
    isMinor: boolean;
  };
  links: ParentItem[];
  candidateParents: CandidateParent[];
}

export function ParentChildLinksForm({
  player,
  links,
  candidateParents,
}: LinksFormProps) {
  const [state, formAction, isPending] = useActionState<
    ParentLinkActionState | null,
    FormData
  >(addParentLinkAction, null);

  const [activeAddSlot, setActiveAddSlot] = useState<number | null>(null);
  const [mode, setMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const slot1 = links.find((l) => l.slot === 1);
  const slot2 = links.find((l) => l.slot === 2);

  const handleRemove = async (linkId: string) => {
    if (!confirm("Are you sure you want to remove this parent link?")) return;
    setIsRemoving(linkId);
    setRemoveError(null);
    try {
      const res = await removeParentLinkAction(linkId, player.id);
      if (!res.success) {
        setRemoveError(res.error || "Failed to remove link.");
      }
    } catch (err: unknown) {
      setRemoveError(err instanceof Error ? err.message : "Error removing link.");
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Navigation */}
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Member Directory
      </Link>

      {/* Player Header */}
      <div className="bg-[#0c2340]/90 border border-slate-700/80 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">
                {player.name}
              </h1>
              {player.isMinor ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  Youth Player (&lt;18)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  Adult Member
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Parent-Child Link Management &bull; Max 2 parents (FR-030)
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {state?.success && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 text-sm"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>Parent link saved successfully.</span>
        </div>
      )}

      {(state?.error || removeError) && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-xl bg-red-950/60 border border-red-700/80 text-red-300 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{state?.error || removeError}</span>
        </div>
      )}

      {/* Parent Slots (Max 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Slot 1 */}
        <div className="bg-[#0c2340]/80 border border-slate-700/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <span className="text-xs uppercase font-bold text-sky-300 tracking-wider">
              Slot 1 &bull; Primary Parent / Guardian
            </span>
            {slot1 && (
              <span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                Linked
              </span>
            )}
          </div>

          {slot1 ? (
            <div className="space-y-3">
              <div>
                <p className="text-base font-bold text-white">{slot1.parentName}</p>
                {slot1.relationship && (
                  <p className="text-xs text-sky-400 font-medium">{slot1.relationship}</p>
                )}
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                {slot1.parentEmail && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{slot1.parentEmail}</span>
                  </div>
                )}
                {slot1.parentPhone && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{slot1.parentPhone}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemove(slot1.id)}
                  disabled={isRemoving === slot1.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isRemoving === slot1.id ? "Removing..." : "Remove Link"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-400">No parent linked to Slot 1.</p>
              <button
                type="button"
                onClick={() => setActiveAddSlot(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Link Parent (Slot 1)
              </button>
            </div>
          )}
        </div>

        {/* Slot 2 */}
        <div className="bg-[#0c2340]/80 border border-slate-700/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <span className="text-xs uppercase font-bold text-sky-300 tracking-wider">
              Slot 2 &bull; Secondary Parent / Guardian
            </span>
            {slot2 && (
              <span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                Linked
              </span>
            )}
          </div>

          {slot2 ? (
            <div className="space-y-3">
              <div>
                <p className="text-base font-bold text-white">{slot2.parentName}</p>
                {slot2.relationship && (
                  <p className="text-xs text-sky-400 font-medium">{slot2.relationship}</p>
                )}
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                {slot2.parentEmail && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{slot2.parentEmail}</span>
                  </div>
                )}
                {slot2.parentPhone && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{slot2.parentPhone}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemove(slot2.id)}
                  disabled={isRemoving === slot2.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isRemoving === slot2.id ? "Removing..." : "Remove Link"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-400">No parent linked to Slot 2.</p>
              <button
                type="button"
                onClick={() => setActiveAddSlot(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Link Parent (Slot 2)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Parent Form Modal / Inline Box */}
      {activeAddSlot !== null && (
        <form
          action={async (fd) => {
            await formAction(fd);
            setActiveAddSlot(null);
          }}
          className="bg-[#0c2340] border border-sky-500/50 rounded-xl p-6 shadow-xl space-y-5 animate-in fade-in duration-150"
        >
          <input type="hidden" name="playerId" value={player.id} />
          <input type="hidden" name="slot" value={activeAddSlot} />
          <input type="hidden" name="mode" value={mode} />

          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-sky-400" />
              Link Parent to Slot {activeAddSlot}
            </h3>
            <button
              type="button"
              onClick={() => setActiveAddSlot(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-900/80 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setMode("EXISTING")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "EXISTING"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Select Existing Member
            </button>
            <button
              type="button"
              onClick={() => setMode("NEW")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "NEW"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create New Parent Inline
            </button>
          </div>

          {/* Existing Member Dropdown */}
          {mode === "EXISTING" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Select Existing Member
              </label>
              <select
                name="parentId"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-sky-500"
              >
                <option value="">-- Choose member --</option>
                {candidateParents
                  .filter(
                    (cp) =>
                      cp.id !== player.id &&
                      cp.id !== slot1?.parentId &&
                      cp.id !== slot2?.parentId
                  )
                  .map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name} {cp.email ? `(${cp.email})` : ""}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* New Parent Inputs */}
          {mode === "NEW" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  placeholder="Parent first name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  placeholder="Parent last name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="parent@example.dk"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+45 XX XX XX XX"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          )}

          {/* Relationship field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Relationship / Title (Optional)
            </label>
            <input
              type="text"
              name="relationship"
              placeholder="e.g. Mother, Father, Guardian"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveAddSlot(null)}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
            >
              {isPending ? "Linking..." : "Save Parent Link"}
            </button>
          </div>
        </form>
      )}

      {/* Rules Information Box */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <Info className="w-4 h-4 text-sky-400" />
          <span>Parent-Child Linkage Rules:</span>
        </div>
        <p>&bull; Maximum 2 parents may be linked to any youth player (FR-030).</p>
        <p>&bull; Linking an adult automatically assigns them the Parent role.</p>
        <p>&bull; Only Administrators can create or remove parent links (FR-031).</p>
        <p>&bull; Linked parents can switch context pitch-side to manage player details, RSVP, and equipment.</p>
      </div>
    </div>
  );
}
