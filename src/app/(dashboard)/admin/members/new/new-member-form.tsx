"use client";

import { useActionState, useState, useId } from "react";
import { createMemberAction } from "@/modules/auth-rbac/actions/onboarding.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Mail,
  Key,
  UserCheck,
  Users,
  ShieldAlert,
  UserPlus2,
  HeartHandshake,
} from "lucide-react";
import { ROLE_VALUES } from "@/modules/auth-rbac/contracts/schemas";
import { isMinor, canHaveLoginAccount } from "@/modules/auth-rbac/domain/age-rules";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Role } from "@prisma/client";

interface AvailableParent {
  id: string;
  name: string;
  email: string | null;
}

interface NewMemberFormProps {
  dict: Dictionary;
  availableParents?: AvailableParent[];
}

export function NewMemberForm({ dict, availableParents = [] }: NewMemberFormProps) {
  const [state, formAction, isPending] = useActionState(createMemberAction, null);

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(["PLAYER"]);
  const [grantLogin, setGrantLogin] = useState(true);

  // Parent 1 State
  const [p1Mode, setP1Mode] = useState<"NEW" | "EXISTING">("NEW");
  const [p1ExistingId, setP1ExistingId] = useState("");
  const [p1Rel, setP1Rel] = useState("Guardian");

  // Parent 2 State
  const [p2Enabled, setP2Enabled] = useState(false);
  const [p2Mode, setP2Mode] = useState<"NEW" | "EXISTING">("NEW");
  const [p2ExistingId, setP2ExistingId] = useState("");
  const [p2Rel, setP2Rel] = useState("Parent");

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const dobId = useId();
  const grantLoginId = useId();

  // Dynamic eligibility calculations based on entered date of birth
  const parsedDob = dateOfBirth ? new Date(dateOfBirth) : null;
  const minor = isMinor(parsedDob);
  const eligibleForLogin = canHaveLoginAccount(parsedDob);
  const isPlayerSelected = selectedRoles.includes("PLAYER");

  const handleDobChange = (value: string) => {
    setDateOfBirth(value);
    const dob = value ? new Date(value) : null;
    if (isMinor(dob)) {
      setSelectedRoles(["PLAYER"]);
    }
    if (!canHaveLoginAccount(dob)) {
      setGrantLogin(false);
    }
  };

  const handleRoleToggle = (role: Role, checked: boolean) => {
    if (checked) {
      setSelectedRoles((prev) => [...prev, role]);
    } else {
      setSelectedRoles((prev) => prev.filter((r) => r !== role));
    }
  };

  if (state?.success) {
    return (
      <Card className="bg-slate-900 border-sky-500/60 shadow-2xl p-6 sm:p-8 animate-in fade-in duration-300">
        <div className="space-y-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-sky-950/80 border border-sky-400 text-sky-400 flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {dict.admin.onboarding.successTitle}
            </h2>
            <p className="text-sm text-slate-300">
              {state.invitationSent
                ? dict.admin.onboarding.successEmailSent.replace("{email}", state.submittedValues?.email || "the member")
                : dict.admin.onboarding.successNoCredentials}
            </p>
            {(state.parentInvitationsSent ?? 0) > 0 && (
              <p className="text-xs text-sky-300">
                {dict.admin.onboarding.successParentsNotified} ({state.parentInvitationsSent})
              </p>
            )}
          </div>

          {state.temporaryPassword && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-1">
              <span className="text-xs uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                Temporary Password Generated:
              </span>
              <p className="font-mono text-xl text-sky-300 tracking-wider font-bold">
                {state.temporaryPassword}
              </p>
              <p className="text-xs text-slate-500">
                (This credential has also been logged/dispatched via the NotificationService)
              </p>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="bg-sky-500 hover:bg-sky-400 text-white font-medium"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {dict.admin.onboarding.createAnother}
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/admin/members")}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
            >
              View All Members
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  let topErrorMessage: string | null = null;
  if (state?.error) {
    const errorKey = state.error.replace("admin.errors.", "") as keyof typeof dict.admin.errors;
    topErrorMessage = dict.admin.errors[errorKey] || dict.admin.errors.SAVE_FAILED;
  }

  return (
    <form action={formAction} className="space-y-8">
      {topErrorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-start gap-3 shadow-lg"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{topErrorMessage}</div>
        </div>
      )}

      {/* Member Classification Helper Banner */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
          minor
            ? !eligibleForLogin
              ? "bg-amber-950/30 border-amber-700/60 text-amber-200"
              : "bg-sky-950/30 border-sky-700/60 text-sky-200"
            : "bg-slate-900/90 border-slate-700/80 text-slate-200"
        }`}
      >
        {minor ? (
          !eligibleForLogin ? (
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <Users className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          )
        ) : (
          <UserCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <p className="font-semibold text-sm">
            {minor
              ? !eligibleForLogin
                ? dict.admin.onboarding.categoryUnder13
                : dict.admin.onboarding.categoryYouthPlayer
              : isPlayerSelected
              ? dict.admin.onboarding.categoryAdultPlayer
              : "Adult Non-Playing Member (Coach, Parent, Admin)"}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {minor
              ? !eligibleForLogin
                ? dict.admin.onboarding.categoryUnder13Desc
                : dict.admin.onboarding.categoryYouthPlayerDesc
              : isPlayerSelected
              ? dict.admin.onboarding.categoryAdultPlayerDesc
              : "Adult member account without playing role. Date of birth is optional."}
          </p>
        </div>
      </div>

      {/* 1. Personal Details Section */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg text-white">
            {dict.admin.onboarding.personalDetails}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={firstNameId} className="text-slate-200 text-sm font-medium">
                {dict.admin.onboarding.firstName} *
              </Label>
              <Input
                id={firstNameId}
                name="firstName"
                required
                placeholder="Lars"
                defaultValue={state?.submittedValues?.firstName}
                className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11"
              />
              {state?.fieldErrors?.firstName && (
                <p className="text-xs text-rose-400">{dict.validation.required}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={lastNameId} className="text-slate-200 text-sm font-medium">
                {dict.admin.onboarding.lastName} *
              </Label>
              <Input
                id={lastNameId}
                name="lastName"
                required
                placeholder="Nielsen"
                defaultValue={state?.submittedValues?.lastName}
                className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11"
              />
              {state?.fieldErrors?.lastName && (
                <p className="text-xs text-rose-400">{dict.validation.required}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <Label htmlFor={dobId} className="text-slate-200 text-sm font-medium">
                  {dict.admin.onboarding.dateOfBirth} {isPlayerSelected ? "*" : ""}
                </Label>
                {!isPlayerSelected && (
                  <span className="text-[11px] text-slate-400 italic">Optional</span>
                )}
              </div>
              <Input
                id={dobId}
                name="dateOfBirth"
                type="date"
                required={isPlayerSelected}
                value={dateOfBirth}
                onChange={(e) => handleDobChange(e.target.value)}
                className={`bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11 ${
                  state?.fieldErrors?.dateOfBirth ? "border-rose-500" : ""
                }`}
              />
              {state?.fieldErrors?.dateOfBirth && (
                <p className="text-xs text-rose-400 font-medium">
                  {dict.admin.errors.PLAYER_REQUIRES_DOB}
                </p>
              )}
              {isPlayerSelected ? (
                minor ? (
                  <p className="text-xs text-amber-400 font-medium">
                    Minor (&lt;18): Parent 1 association required below.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 font-medium">
                    Adult (18+): independent player with 0 parent links.
                  </p>
                )
              ) : (
                <p className="text-xs text-slate-500">
                  Optional for non-players (defaults to adult account).
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor={emailId} className="text-slate-200 text-sm font-medium">
                {dict.admin.onboarding.email}
              </Label>
              <Input
                id={emailId}
                name="email"
                type="email"
                placeholder={minor ? "Optional for minors" : "lars@example.dk"}
                defaultValue={state?.submittedValues?.email}
                className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11"
              />
              {state?.fieldErrors?.email && (
                <p className="text-xs text-rose-400">{dict.validation.invalidEmail}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor={phoneId} className="text-slate-200 text-sm font-medium">
                {dict.admin.onboarding.phone}
              </Label>
              <Input
                id={phoneId}
                name="phone"
                type="tel"
                placeholder="+45 12 34 56 78"
                defaultValue={state?.submittedValues?.phone}
                className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Parent & Guardian Section (ONLY displayed when minor player is selected) */}
      {minor && (
        <Card className="bg-slate-900/90 border-sky-700/60 shadow-xl animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-sky-400" />
              <span>{dict.admin.onboarding.parentsTitle}</span>
            </CardTitle>
            <CardDescription className="text-sm text-slate-300">
              {dict.admin.onboarding.parentsSubtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parent 1 (Mandatory for Minors) */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <input type="hidden" name="p1_enabled" value="on" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <span className="text-sm font-bold text-sky-300 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs">
                    1
                  </span>
                  {dict.admin.onboarding.parent1Title}
                </span>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setP1Mode("NEW")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      p1Mode === "NEW"
                        ? "bg-sky-500 text-white"
                        : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {dict.admin.onboarding.parentModeNew}
                  </button>
                  <button
                    type="button"
                    onClick={() => setP1Mode("EXISTING")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      p1Mode === "EXISTING"
                        ? "bg-sky-500 text-white"
                        : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {dict.admin.onboarding.parentModeExisting}
                  </button>
                </div>
              </div>

              <input type="hidden" name="p1_mode" value={p1Mode} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs text-slate-300">{dict.admin.onboarding.relationshipLabel}</Label>
                  <Input
                    name="p1_relationship"
                    value={p1Rel}
                    onChange={(e) => setP1Rel(e.target.value)}
                    placeholder="Mother / Father / Guardian"
                    className="bg-slate-900 border-slate-700 text-white h-10 text-sm"
                  />
                </div>

                {p1Mode === "EXISTING" ? (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs text-slate-300">Select Existing Member *</Label>
                    <select
                      name="p1_existingProfileId"
                      value={p1ExistingId}
                      onChange={(e) => setP1ExistingId(e.target.value)}
                      required
                      className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">{dict.admin.onboarding.selectParentPlaceholder}</option>
                      {availableParents.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.email ? `(${p.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Parent First Name *</Label>
                      <Input
                        name="p1_firstName"
                        required
                        placeholder="Mette"
                        className="bg-slate-900 border-slate-700 text-white h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Parent Last Name *</Label>
                      <Input
                        name="p1_lastName"
                        required
                        placeholder="Nielsen"
                        className="bg-slate-900 border-slate-700 text-white h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Parent Email (Login) *</Label>
                      <Input
                        name="p1_email"
                        type="email"
                        required
                        placeholder="mette@example.dk"
                        className="bg-slate-900 border-slate-700 text-white h-10 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Parent 2 (Optional) */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="p2_toggle"
                    name="p2_enabled"
                    checked={p2Enabled}
                    onCheckedChange={(checked) => setP2Enabled(!!checked)}
                    className="border-slate-600 data-[state=checked]:bg-sky-500"
                  />
                  <Label htmlFor="p2_toggle" className="text-sm font-semibold text-slate-200 cursor-pointer">
                    {dict.admin.onboarding.parent2Title}
                  </Label>
                </div>

                {p2Enabled && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setP2Mode("NEW")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        p2Mode === "NEW"
                          ? "bg-sky-500 text-white"
                          : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {dict.admin.onboarding.parentModeNew}
                    </button>
                    <button
                      type="button"
                      onClick={() => setP2Mode("EXISTING")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        p2Mode === "EXISTING"
                          ? "bg-sky-500 text-white"
                          : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {dict.admin.onboarding.parentModeExisting}
                    </button>
                  </div>
                )}
              </div>

              {p2Enabled && (
                <>
                  <input type="hidden" name="p2_mode" value={p2Mode} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-xs text-slate-300">{dict.admin.onboarding.relationshipLabel}</Label>
                      <Input
                        name="p2_relationship"
                        value={p2Rel}
                        onChange={(e) => setP2Rel(e.target.value)}
                        placeholder="Father / Guardian"
                        className="bg-slate-900 border-slate-700 text-white h-10 text-sm"
                      />
                    </div>

                    {p2Mode === "EXISTING" ? (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs text-slate-300">Select Existing Member *</Label>
                        <select
                          name="p2_existingProfileId"
                          value={p2ExistingId}
                          onChange={(e) => setP2ExistingId(e.target.value)}
                          required
                          className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">{dict.admin.onboarding.selectParentPlaceholder}</option>
                          {availableParents.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.email ? `(${p.email})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-300">Parent First Name *</Label>
                          <Input
                            name="p2_firstName"
                            required
                            placeholder="Søren"
                            className="bg-slate-900 border-slate-700 text-white h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-300">Parent Last Name *</Label>
                          <Input
                            name="p2_lastName"
                            required
                            placeholder="Nielsen"
                            className="bg-slate-900 border-slate-700 text-white h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-300">Parent Email (Login) *</Label>
                          <Input
                            name="p2_email"
                            type="email"
                            required
                            placeholder="soren@example.dk"
                            className="bg-slate-900 border-slate-700 text-white h-10 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Role Assignment Section */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg text-white">
            {dict.admin.onboarding.rolesTitle}
          </CardTitle>
          <CardDescription className="text-sm text-slate-400">
            {dict.admin.onboarding.rolesSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ROLE_VALUES.map((role) => {
              const isRoleDisabled = minor && role !== "PLAYER";
              const isChecked = selectedRoles.includes(role);

              return (
                <div
                  key={role}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isChecked
                      ? "bg-sky-950/50 border-sky-600 text-white"
                      : "bg-slate-950/40 border-slate-800 text-slate-400"
                  } ${isRoleDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Checkbox
                    id={`role-${role}`}
                    name="roles"
                    value={role}
                    checked={isChecked}
                    disabled={isRoleDisabled}
                    onCheckedChange={(checked) => handleRoleToggle(role, !!checked)}
                    className="border-slate-600 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <Label
                    htmlFor={`role-${role}`}
                    className="text-sm font-medium cursor-pointer select-none flex-1"
                  >
                    {dict.roles[role]}
                  </Label>
                </div>
              );
            })}
          </div>
          {state?.fieldErrors?.roles && (
            <p className="text-xs text-rose-400 mt-2">{dict.validation.rolesRequired}</p>
          )}
        </CardContent>
      </Card>

      {/* 4. Credentials & Invitation Section */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-sky-400" />
            <span>{dict.admin.onboarding.credentialsTitle}</span>
          </CardTitle>
          <CardDescription className="text-sm text-slate-400">
            {dict.admin.onboarding.grantLoginHelp}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <Checkbox
              id={grantLoginId}
              name="grantLoginAccess"
              checked={grantLogin}
              disabled={!eligibleForLogin}
              onCheckedChange={(checked) => setGrantLogin(!!checked)}
              className="mt-1 border-slate-600 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
            />
            <div className="space-y-1">
              <Label
                htmlFor={grantLoginId}
                className="text-sm font-semibold text-white cursor-pointer select-none"
              >
                {dict.admin.onboarding.grantLogin}
              </Label>
              {!eligibleForLogin ? (
                <p className="text-xs text-amber-400">
                  {dict.admin.errors.LOGIN_REQUIRES_AGE_13}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Generates an 8-character CSPRNG temporary password valid for 7 days.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => (window.location.href = "/admin/members")}
          className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
        >
          {dict.common.cancel}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-lg shadow-sky-950/40 px-8 h-11"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {dict.common.submitting}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              {dict.admin.onboarding.submitButton}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
