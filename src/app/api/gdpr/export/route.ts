import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/modules/auth-rbac/services/session-guard";
import { generateGdprExport } from "@/modules/auth-rbac/services/gdpr-export.service";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("targetProfileId") || session.memberProfileId;

  try {
    const exportData = await generateGdprExport({
      targetProfileId: targetId,
      requesterProfileId: session.memberProfileId,
    });

    const filename = `rcc-gdpr-export-${targetId.substring(0, 8)}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate GDPR export.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
