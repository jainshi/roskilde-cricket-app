import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_DAYS,
  validateSession,
  revokeSession,
  ActiveSessionData,
} from "./session.service";
import { getActivationStepForProfile } from "./auth.service";

/**
 * Sets session cookie with strict security flags.
 */
export async function setSessionCookie(sessionToken: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    });
  } catch (err) {
    console.warn("[setSessionCookie] Unable to set cookie in current scope:", err);
  }
}

/**
 * Clears session cookie from browser.
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (err) {
    console.warn("[clearSessionCookie] Unable to clear cookie in current scope:", err);
  }
}

/**
 * Retrieves and validates the current active session.
 */
export async function getCurrentSession(): Promise<ActiveSessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    return await validateSession(token);
  } catch {
    return null;
  }
}

/**
 * Route guard: requires an active session. Redirects to /signin if not signed in.
 */
export async function requireSession(): Promise<ActiveSessionData> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/signin");
  }
  return session;
}

/**
 * Route guard: requires an active session that has completed mandatory reset and GDPR consent.
 * Redirects to /reset-password or /consent if onboarding is incomplete.
 */
export async function requireActivatedSession(): Promise<ActiveSessionData> {
  const session = await requireSession();

  const step = await getActivationStepForProfile({
    memberProfileId: session.memberProfileId,
    mustResetPassword: session.mustResetPassword,
  });

  if (step === "RESET_PASSWORD") {
    redirect("/reset-password");
  }

  if (step === "CONSENT" || step === "AWAITING_GUARDIAN_CONSENT") {
    redirect("/consent");
  }

  return session;
}

/**
 * Route guard: requires an active session with the ADMIN role.
 * (Note: Phase 4 introduces fine-grained requirePermission guards).
 */
export async function requireAdminSession(): Promise<ActiveSessionData> {
  const session = await requireActivatedSession();
  if (!session.roles.includes("ADMIN")) {
    redirect("/dashboard");
  }
  return session;
}
