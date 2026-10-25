"use client";

import { useActionState } from "react";
import { updateProfileAction, ProfileActionState } from "@/modules/auth-rbac/actions/profile.actions";
import { FullMemberProfile } from "@/modules/auth-rbac/services/profile.service";
import {
  User,
  Shield,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  Award,
  Shirt,
  Eye,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileEditFormProps {
  profile: FullMemberProfile;
  currentUserId: string;
}

const BATTING_POSITIONS = [
  { value: "", label: "-- Select Batting Position --" },
  { value: "OPENING_BATTER", label: "Opening Batter (No. 1–2)" },
  { value: "TOP_ORDER", label: "Top-Order Batter (No. 3–4)" },
  { value: "MIDDLE_ORDER", label: "Middle-Order Batter (No. 5–7)" },
  { value: "FINISHER", label: "Finisher / Lower-Middle" },
  { value: "TAILENDER", label: "Tailender (No. 8–11)" },
];

const BOWLING_STYLES = [
  { value: "", label: "-- Select Bowling Style --" },
  { value: "RIGHT_ARM_FAST", label: "Right-Arm Fast / Pace" },
  { value: "RIGHT_ARM_MEDIUM", label: "Right-Arm Medium Pace" },
  { value: "LEFT_ARM_FAST", label: "Left-Arm Fast / Pace" },
  { value: "LEFT_ARM_MEDIUM", label: "Left-Arm Medium Pace" },
  { value: "OFF_SPIN", label: "Right-Arm Off-Spin" },
  { value: "LEG_SPIN", label: "Right-Arm Leg-Spin" },
  { value: "LEFT_ARM_ORTHODOX", label: "Slow Left-Arm Orthodox" },
  { value: "LEFT_ARM_WRIST_SPIN", label: "Left-Arm Wrist-Spin" },
  { value: "DOES_NOT_BOWL", label: "Does Not Bowl" },
];

const SHIRT_SIZES = [
  { value: "", label: "-- Select Shirt Size --" },
  { value: "YOUTH_XXS", label: "Youth XXS (Age 5–6)" },
  { value: "YOUTH_XS", label: "Youth XS (Age 7–8)" },
  { value: "YOUTH_S", label: "Youth S (Age 9–10)" },
  { value: "YOUTH_M", label: "Youth M (Age 11–12)" },
  { value: "YOUTH_L", label: "Youth L (Age 13–14)" },
  { value: "YOUTH_XL", label: "Youth XL (Age 15–16)" },
  { value: "ADULT_S", label: "Adult Small" },
  { value: "ADULT_M", label: "Adult Medium" },
  { value: "ADULT_L", label: "Adult Large" },
  { value: "ADULT_XL", label: "Adult XL" },
  { value: "ADULT_XXL", label: "Adult XXL" },
  { value: "ADULT_XXXL", label: "Adult 3XL" },
];

const TROUSER_SIZES = [
  { value: "", label: "-- Select Trouser Size --" },
  { value: "YOUTH_XXS", label: "Youth XXS" },
  { value: "YOUTH_XS", label: "Youth XS" },
  { value: "YOUTH_S", label: "Youth S" },
  { value: "YOUTH_M", label: "Youth M" },
  { value: "YOUTH_L", label: "Youth L" },
  { value: "YOUTH_XL", label: "Youth XL" },
  { value: "ADULT_S", label: "Adult Small" },
  { value: "ADULT_M", label: "Adult Medium" },
  { value: "ADULT_L", label: "Adult Large" },
  { value: "ADULT_XL", label: "Adult XL" },
  { value: "ADULT_XXL", label: "Adult XXL" },
  { value: "ADULT_XXXL", label: "Adult 3XL" },
];

const CAP_SIZES = [
  { value: "", label: "-- Select Cap Size --" },
  { value: "YOUTH_S", label: "Youth Small / Junior" },
  { value: "YOUTH_M", label: "Youth Medium" },
  { value: "YOUTH_L", label: "Youth Large" },
  { value: "ADULT_S", label: "Adult Small" },
  { value: "ADULT_M", label: "Adult Medium / Standard" },
  { value: "ADULT_L", label: "Adult Large / XL" },
];

export function ProfileEditForm({ profile, currentUserId }: ProfileEditFormProps) {
  const [state, formAction, isPending] = useActionState<ProfileActionState | null, FormData>(
    updateProfileAction,
    null
  );

  return (
    <div className="space-y-6">
      {/* Delegation Notice Banner */}
      {profile.isDelegated && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-white text-sm">
                Parent Delegated Access &bull; {profile.fullName}
              </p>
              <p className="text-xs text-amber-300/80">
                You are updating profile details, emergency contact, and kit sizes for your linked youth player.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider shrink-0">
            Linked Youth
          </span>
        </div>
      )}

      {/* Incomplete Emergency Contact Warning (FR-052) */}
      {profile.isEmergencyContactIncomplete && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 flex items-start gap-3 shadow-md"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-white text-sm">
              Action Required: Missing Emergency Contact (FR-052)
            </h3>
            <p className="text-xs text-red-200/90 leading-relaxed">
              All active players must have a designated primary emergency contact (Name, Relationship, and Phone Number) on file before participating in matches and practice sessions.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {state?.success && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 flex items-center gap-3 text-sm shadow-md"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Profile changes and privacy preferences have been saved successfully.</span>
        </div>
      )}

      {/* General Error Notification */}
      {state?.error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-950/60 border border-red-700/80 text-red-300 flex items-center gap-3 text-sm shadow-md"
        >
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-8">
        <input type="hidden" name="targetProfileId" value={profile.id} />

        {/* Section 1: Basic & Contact Details */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 text-sky-400">
            <User className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                defaultValue={profile.firstName}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                defaultValue={profile.lastName}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  disabled
                  value={profile.email || "No direct email (contact via linked parents)"}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60 text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Account login emails are managed by club administrators.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  name="phone"
                  defaultValue={profile.phone || ""}
                  placeholder="+45 12 34 56 78"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Postal Address */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Street Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                name="address"
                defaultValue={profile.address || ""}
                placeholder="e.g. Ringvejen 15"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">City</label>
              <input
                type="text"
                name="city"
                defaultValue={profile.city || ""}
                placeholder="Roskilde"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Postal Code</label>
              <input
                type="text"
                name="postalCode"
                defaultValue={profile.postalCode || ""}
                placeholder="4000"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Primary Emergency Contact (FR-050, FR-052) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5 text-red-400">
              <HeartPulse className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white">Emergency Contact</h2>
            </div>
            {profile.isEmergencyContactIncomplete ? (
              <span className="px-2.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 text-xs font-bold">
                Incomplete
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold">
                Configured
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Contact person in the event of an on-field injury or medical emergency during training or match play.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contact Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="emergencyName"
                defaultValue={profile.primaryEmergencyContact?.name || ""}
                placeholder="e.g. Lars Hansen"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Relationship <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="emergencyRelationship"
                defaultValue={profile.primaryEmergencyContact?.relationship || ""}
                placeholder="e.g. Mother / Spouse"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Emergency Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                name="emergencyPhone"
                defaultValue={profile.primaryEmergencyContact?.phone || ""}
                placeholder="+45 98 76 54 32"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Cricket Attributes (FR-050) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 text-amber-400">
            <Award className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Cricket Specializations</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Preferred Batting Position
              </label>
              <select
                name="battingPosition"
                defaultValue={profile.battingPosition || ""}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {BATTING_POSITIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary Bowling Style
              </label>
              <select
                name="bowlingStyle"
                defaultValue={profile.bowlingStyle || ""}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {BOWLING_STYLES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Secondary Roles (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  name="secondaryRoles"
                  value="WICKETKEEPER"
                  defaultChecked={profile.secondaryRoles.includes("WICKETKEEPER")}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-200">Wicketkeeper (WK)</span>
              </label>

              <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  name="secondaryRoles"
                  value="ALL_ROUNDER"
                  defaultChecked={profile.secondaryRoles.includes("ALL_ROUNDER")}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-200">All-Rounder</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Club Apparel & Kit Sizes (FR-050) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 text-emerald-400">
            <Shirt className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Club Kit & Apparel Sizes</h2>
          </div>

          <p className="text-xs text-slate-400">
            Pre-ordering and matchday gear allocation based on registered sizing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Playing Shirt Size
              </label>
              <select
                name="shirtSize"
                defaultValue={profile.shirtSize || ""}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {SHIRT_SIZES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Playing Trouser Size
              </label>
              <select
                name="trouserSize"
                defaultValue={profile.trouserSize || ""}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {TROUSER_SIZES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Club Cap Size
              </label>
              <select
                name="capSize"
                defaultValue={profile.capSize || ""}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {CAP_SIZES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Member Directory Privacy Settings (FR-054, FR-055, FR-056) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 text-sky-400">
            <Eye className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Directory Privacy Settings</h2>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/60 text-sky-200 text-xs space-y-1">
            <p className="font-semibold text-sky-300">Privacy Default: Opt-In Shielding (FR-055)</p>
            <p className="leading-relaxed">
              Your contact details are hidden by default from the general club directory. Emergency contacts, date of birth, and kit sizes are NEVER revealed in the directory.
              {profile.isMinor && (
                <span className="block mt-1 text-amber-300 font-semibold">
                  Youth Protection Notice: Minor contact details are always shielded from regular players and only visible to authorized club coaches and administrators (FR-056).
                </span>
              )}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition-colors">
              <div>
                <span className="text-sm font-semibold text-white block">
                  Show Email in Directory
                </span>
                <span className="text-xs text-slate-400">
                  Allow club members to view this email address in the directory.
                </span>
              </div>
              <input
                type="checkbox"
                name="showEmailInDirectory"
                defaultChecked={profile.privacySettings.showEmailInDirectory}
                className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition-colors">
              <div>
                <span className="text-sm font-semibold text-white block">
                  Show Phone in Directory
                </span>
                <span className="text-xs text-slate-400">
                  Allow club members to view this phone number in the directory.
                </span>
              </div>
              <input
                type="checkbox"
                name="showPhoneInDirectory"
                defaultChecked={profile.privacySettings.showPhoneInDirectory}
                className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition-colors">
              <div>
                <span className="text-sm font-semibold text-white block">
                  Show City / Address in Directory
                </span>
                <span className="text-xs text-slate-400">
                  Allow club members to view your city/municipality in the directory.
                </span>
              </div>
              <input
                type="checkbox"
                name="showAddressInDirectory"
                defaultChecked={profile.privacySettings.showAddressInDirectory}
                className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 w-5 h-5"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-sky-500 hover:bg-sky-400 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-sky-950/50 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? "Saving Profile..." : "Save Profile Changes"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
