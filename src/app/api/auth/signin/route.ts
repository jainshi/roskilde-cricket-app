import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/modules/auth-rbac/services/auth.service";
import {
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_DAYS,
} from "@/modules/auth-rbac/services/session.service";
import { SignInSchema } from "@/modules/auth-rbac/contracts/schemas";

export async function POST(request: NextRequest) {
  try {
    let email = "";
    let password = "";
    let from = "/dashboard";
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      email = body.email || "";
      password = body.password || "";
      from = body.from || "/dashboard";
    } else {
      const formData = await request.formData();
      email = (formData.get("email") as string) || "";
      password = (formData.get("password") as string) || "";
      from = (formData.get("from") as string) || "/dashboard";
    }

    const parsed = SignInSchema.safeParse({ email, password });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "auth.errors.invalidCredentials" },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    const result = await authenticateUser({
      email: parsed.data.email,
      password: parsed.data.password,
      userAgent,
      ipAddress,
    });

    if (!result.ok || !result.sessionToken) {
      const errorKey =
        result.errorCode === "ACCOUNT_LOCKED"
          ? "accountLocked"
          : result.errorCode === "INVITATION_EXPIRED"
          ? "invitationExpired"
          : result.errorCode === "ACCOUNT_DEACTIVATED"
          ? "accountDeactivated"
          : "invalidCredentials";

      return NextResponse.json(
        { success: false, error: `auth.errors.${errorKey}` },
        { status: 401 }
      );
    }

    const safeFrom =
      from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard";
    const redirectTo = result.mustResetPassword ? "/reset-password" : safeFrom;

    const response = NextResponse.json({
      success: true,
      redirectTo,
    });

    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("[api/auth/signin] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "auth.errors.genericError" },
      { status: 500 }
    );
  }
}
