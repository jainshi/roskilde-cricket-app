"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  authenticateUser,
  completeMandatoryPasswordReset,
  recordGdprConsent,
  getActivationStepForProfile,
  requestPasswordReset,
  resetPasswordWithToken,
} from "../services/auth.service";
import {
  setSessionCookie,
  clearSessionCookie,
  requireSession,
  getCurrentSession,
} from "../services/session-guard";
import {
  revokeSession,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_DAYS,
} from "../services/session.service";
import { SignInSchema, ResetPasswordSchema } from "../contracts/schemas";

export interface ActionState<T = any> {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
}

export async function signInAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const from = (formData.get("from") as string) || "/dashboard";

  const parsed = SignInSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      error: "auth.errors.invalidCredentials",
    };
  }

  let userAgent: string | undefined;
  let ipAddress: string | undefined;

  try {
    const reqHeaders = await headers();
    userAgent = reqHeaders.get("user-agent") || undefined;
    ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  } catch {
    // Graceful fallback if headers() is called outside an active request scope
  }

  const result = await authenticateUser({
    email: parsed.data.email,
    password: parsed.data.password,
    userAgent,
    ipAddress,
  });

  if (!result.ok || !result.sessionToken) {
    return {
      error: `auth.errors.${result.errorCode === "ACCOUNT_LOCKED" ? "accountLocked" : result.errorCode === "INVITATION_EXPIRED" ? "invitationExpired" : result.errorCode === "ACCOUNT_DEACTIVATED" ? "accountDeactivated" : "invalidCredentials"}`,
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  });

  // If mandatory password reset required, route directly to /reset-password
  if (result.mustResetPassword) {
    redirect("/reset-password");
  }

  // Safe redirect path
  const safeFrom = from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard";
  redirect(safeFrom);
}

export async function requestPasswordResetAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  if (!email || !email.includes("@")) {
    return { error: "auth.errors.invalidCredentials" };
  }

  let baseUrl = "http://localhost:3000";
  try {
    const reqHeaders = await headers();
    const host = reqHeaders.get("host") || "localhost:3000";
    const protocol = reqHeaders.get("x-forwarded-proto") || "http";
    baseUrl = `${protocol}://${host}`;
  } catch {
    // Fallback if headers() is called outside request scope
  }

  await requestPasswordReset({
    email,
    baseUrl,
  });

  return { success: true };
}

export async function resetPasswordAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const token = (formData.get("token") as string) || null;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const parsed = ResetPasswordSchema.safeParse({ password, confirmPassword });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors };
  }

  // 1. If token is present, perform tokenized reset (no session required)
  if (token) {
    const result = await resetPasswordWithToken({
      token,
      newPassword: parsed.data.password,
    });

    if (!result.ok) {
      return {
        error:
          result.errorCode === "SAME_AS_CURRENT"
            ? "auth.errors.sameAsCurrentPassword"
            : result.errorCode === "INVALID_OR_EXPIRED"
            ? "auth.errors.tokenExpiredOrInvalid"
            : "auth.errors.genericError",
      };
    }

    redirect("/signin?reason=password_reset_success");
  }

  // 2. Otherwise, perform session-based reset for mandatory initial login
  const session = await requireSession();

  const result = await completeMandatoryPasswordReset({
    userAccountId: session.userAccountId,
    newPassword: parsed.data.password,
  });

  if (!result.ok) {
    return {
      error:
        result.errorCode === "SAME_AS_CURRENT"
          ? "auth.errors.sameAsCurrentPassword"
          : "auth.errors.genericError",
    };
  }

  // Check if consent is needed next
  const nextStep = await getActivationStepForProfile({
    memberProfileId: session.memberProfileId,
    mustResetPassword: false,
  });

  if (nextStep === "CONSENT" || nextStep === "AWAITING_GUARDIAN_CONSENT") {
    redirect("/consent");
  }

  redirect("/dashboard");
}

export async function consentAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();

  const accepted = formData.get("accepted") === "on";
  if (!accepted) {
    return { error: "auth.errors.consentRequired" };
  }

  let ipAddress: string | undefined;
  try {
    const reqHeaders = await headers();
    ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  } catch {
    // Fallback if headers() is called outside request scope
  }

  await recordGdprConsent({
    subjectProfileId: session.memberProfileId,
    consentedById: session.memberProfileId,
    ipAddress,
  });

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const session = await getCurrentSession();
  if (session) {
    await revokeSession(session.sessionToken);
  }
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/signin");
}
