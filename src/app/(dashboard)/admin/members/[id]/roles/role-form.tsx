"use client";

import { useActionState, useState } from "react";
import { Role } from "@prisma/client";
import { updateMemberRolesAction, RoleActionState } from "@/modules/auth-rbac/actions/role.actions";
import { Shield, AlertCircle, CheckCircle2, User, ArrowLeft, Lock, Info } from "lucide-react";
import Link from "next/link";

interface MemberRoleFormProps {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    dateOfBirth: string | null;
    isMinor: boolean;
    roles: Role[];
    totalActiveAdmins: number;
  };
}

const ALL_ROLES: { role: Role; label: string; description: string }[] = [
  {
    role: Role.ADMIN,
    label: "Administrator",
    description: "Full management of club members, role assignments, parent-child links, and system settings.",
  },
  {
    role: Role.COACH,
    label: "Coach",
    description: "Create official fixtures, manage training drills, attendance check-in, squad selection, and match scoring.",
  },
  {
    role: Role.AD_HOC_COACH,
    label: "Ad-Hoc Coach",
    description: "Create ad-hoc drills, take attendance at sessions, and view member roster.",
  },
  {
    role: Role.PLAYER,
    label: "Player",
    description: "View team fixtures, RSVP for sessions, checkout personal equipment, and browse member directory.",
  },
  {
    role: Role.PARENT,
    label: "Parent / Guardian",
    description: "Manage linked youth player profile and cricket details, RSVP on behalf of children, and view directory.",
  },
];

export function RoleManagementForm({ member }: MemberRoleFormProps) {
  const [state, formAction, isPending] = useActionState<RoleActionState | null, FormData>(
    updateMemberRolesAction,
    null
  );

  const [selectedRoles, setSelectedRoles] = useState<Role[]>(member.roles);

  const isOnlyAdmin =
    member.roles.includes(Role.ADMIN) && member.totalActiveAdmins <= 1;

  const handleRoleToggle = (role: Role) => {
    // If member is minor, they can only hold PLAYER role
    if (member.isMinor && role !== Role.PLAYER) {
      return;
    }

    // If member is the only active admin and trying to uncheck ADMIN, disallow
    if (isOnlyAdmin && role === Role.ADMIN && selectedRoles.includes(Role.ADMIN)) {
      return;
    }

    if (selectedRoles.includes(role)) {
      // Must retain at least one role
      if (selectedRoles.length === 1) return;
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back navigation */}
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Member Directory
      </Link>

      {/* Member Summary Header */}
      <div className="bg-[#0c2340]/90 border border-slate-700/80 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">
                {member.firstName} {member.lastName}
              </h1>
              {member.isMinor ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  Youth / Minor (&lt;18)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  Adult Member
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {member.email || "No email on record"} &bull; DOB:{" "}
              {member.dateOfBirth
                ? new Date(member.dateOfBirth).toLocaleDateString("en-GB")
                : "Not specified"}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {state?.success && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 text-sm"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-semibold">Role Assignments Updated Successfully</p>
            <p className="text-emerald-400/90 text-xs mt-0.5">
              Changes take effect immediately on the member&apos;s next action without requiring them to sign out (FR-003).
            </p>
          </div>
        </div>
      )}

      {state?.error && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-xl bg-red-950/60 border border-red-700/80 text-red-300 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Minor Restriction Notice */}
      {member.isMinor && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-300 text-sm">
          <Info className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold">Minor Role Restriction (FR-004)</p>
            <p className="text-amber-400/90 text-xs mt-0.5">
              Members under 18 years of age can only hold the <strong>Player</strong> role. Non-player roles (Admin, Coach, Ad-Hoc Coach, Parent) are restricted for safeguarding.
            </p>
          </div>
        </div>
      )}

      {/* Last Admin Safeguard Notice */}
      {isOnlyAdmin && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-950/60 border border-sky-600/70 text-sky-200 text-sm">
          <Lock className="w-5 h-5 shrink-0 text-sky-400 mt-0.5" />
          <div>
            <p className="font-semibold">Sole Administrator Safeguard (FR-005)</p>
            <p className="text-sky-300/90 text-xs mt-0.5">
              This member is the only active Administrator in the system. The Admin role cannot be revoked until another Administrator is assigned.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form action={formAction} className="bg-[#0c2340]/90 border border-slate-700/80 rounded-xl p-6 shadow-sm space-y-6">
        <input type="hidden" name="targetProfileId" value={member.id} />

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-400" />
            Assign Roles
          </h2>
          <p className="text-xs text-slate-400">
            Members can hold any combination of roles. Permissions are dynamically combined (FR-002).
          </p>
        </div>

        <div className="space-y-3">
          {ALL_ROLES.map(({ role, label, description }) => {
            const isChecked = selectedRoles.includes(role);
            const isMinorDisabled = member.isMinor && role !== Role.PLAYER;
            const isAdminLocked = isOnlyAdmin && role === Role.ADMIN;
            const isDisabled = isMinorDisabled || isAdminLocked;

            return (
              <label
                key={role}
                className={`relative flex items-start gap-3.5 p-4 rounded-lg border transition-all cursor-pointer min-h-[56px] select-none ${
                  isChecked
                    ? "bg-sky-950/40 border-sky-500/80 shadow-sm"
                    : "bg-slate-900/60 border-slate-700 hover:border-slate-600"
                } ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  name="roles"
                  value={role}
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => handleRoleToggle(role)}
                  className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-400 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-sm">{label}</span>
                    {isAdminLocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-300 bg-sky-900/60 px-2 py-0.5 rounded border border-sky-700">
                        <Lock className="w-3 h-3" /> Last Active Admin
                      </span>
                    )}
                    {isMinorDisabled && (
                      <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                        Restricted (&lt;18)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Hidden inputs for locked roles so form submission always preserves them if disabled */}
        {isOnlyAdmin && !selectedRoles.includes(Role.ADMIN) && (
          <input type="hidden" name="roles" value={Role.ADMIN} />
        )}
        {member.isMinor && (
          <input type="hidden" name="roles" value={Role.PLAYER} />
        )}

        <div className="pt-4 border-t border-slate-700 flex items-center justify-between gap-4">
          <Link
            href="/admin/members"
            className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors min-h-[44px] flex items-center"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isPending || selectedRoles.length === 0}
            className="px-6 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors min-h-[44px] flex items-center gap-2 shadow-sm"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Role Assignments</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
