import { NextRequest, NextResponse } from "next/server";
import { evaluateAndDispatchReminders } from "@/modules/inventory/services/reminder.service";

export const dynamic = "force-dynamic";

/**
 * Secured Cron Route Handler: Evaluates overdue equipment loans and dispatches dual-parent alerts.
 * Authenticated via `Authorization: Bearer ${CRON_SECRET}` header.
 *
 * Can be invoked by external schedulers (Vercel Cron, GitHub Actions, system crontab, Coolify).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET || "rcc_cron_secret_2026";

  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();

  if (!token || token !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing cron secret." },
      { status: 401 }
    );
  }

  try {
    const result = await evaluateAndDispatchReminders({ dryRun: false });

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        summary: `Evaluated ${result.evaluatedCount} loan(s); dispatched ${result.remindersSentCount} overdue reminder(s); skipped ${result.skippedCooldownCount} on 24h cooldown.`,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Cron overdue reminder dispatch failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process overdue reminders.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
