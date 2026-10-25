"use client";

import { useActionState, useState } from "react";
import {
  changePasswordAction,
  signOutEverywhereAction,
  SecurityActionState,
} from "@/modules/auth-rbac/actions/security.actions";
import {
  Key,
  Shield,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SecurityClient() {
  const [state, formAction, isPending] = useActionState<SecurityActionState | null, FormData>(
    changePasswordAction,
    null
  );

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSignoutEverywherePending, setIsSignoutEverywherePending] = useState(false);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {state?.success && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 flex items-center gap-3 text-sm shadow-md"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Your password has been changed successfully.</span>
        </div>
      )}

      {state?.error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-950/60 border border-red-700/80 text-red-300 flex items-center gap-3 text-sm shadow-md"
        >
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Card 1: Change Password Form (SRS §3.1.3) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-sky-400">
          <Key className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Change Account Password</h2>
        </div>

        <p className="text-xs text-slate-300">
          Passwords must be at least 10 characters long, contain an uppercase letter, lowercase letter, number, and special character.
        </p>

        <form action={formAction} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                name="currentPassword"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                name="newPassword"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs h-10 px-6 shadow-md"
            >
              {isPending ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </form>
      </div>

      {/* Card 2: Multi-Device Session Management ("Sign out everywhere" T049) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-amber-400">
          <Smartphone className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Active Device Sessions</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          If you have lost a mobile phone, tablet, or logged into a shared computer, you can terminate all active login sessions immediately across all devices. You will need to sign in again on this device.
        </p>

        <div className="pt-2">
          <form
            action={async () => {
              setIsSignoutEverywherePending(true);
              await signOutEverywhereAction();
            }}
          >
            <Button
              type="submit"
              disabled={isSignoutEverywherePending}
              variant="outline"
              className="border-amber-700/80 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 text-xs font-bold h-10 px-5 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4 text-amber-400" />
              <span>
                {isSignoutEverywherePending ? "Revoking Sessions..." : "Sign Out Everywhere"}
              </span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
