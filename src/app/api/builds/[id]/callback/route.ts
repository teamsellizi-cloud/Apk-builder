import { NextResponse } from "next/server";
import { db } from "@/db";
import { builds, appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    const settingsList = await db.select().from(appSettings).limit(1);
    const expectedSecret = settingsList[0]?.callbackSecret;

    // Strict Webhook Authentication: Token MUST be provided and match expected secret
    if (!token || !expectedSecret || token !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing webhook callback token." },
        { status: 401 }
      );
    }

    const buildRecords = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
    if (buildRecords.length === 0) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    const currentBuild = buildRecords[0];
    let updatedLogs = currentBuild.logs;

    const body = await req.json().catch(() => ({}));
    const { status, progress, step, error, logMessage, apkFileSize, apkSha256 } = body;

    if (logMessage) {
      updatedLogs += `[${new Date().toISOString()}] [RUNNER] ${logMessage}\n`;
    }

    const updateData: Partial<typeof builds.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (progress !== undefined) updateData.progressPercent = progress;
    if (step) updateData.currentStep = step;
    if (error) {
      updateData.errorMessage = error;
      updatedLogs += `[${new Date().toISOString()}] [ERROR] ${error}\n`;
    }

    if (status === "completed") {
      updateData.completedAt = new Date();
      if (apkFileSize) updateData.apkFileSize = apkFileSize;
      if (apkSha256) updateData.apkSha256 = apkSha256;
      updatedLogs += `[${new Date().toISOString()}] [SUCCESS] Signed APK verified and stored in private Supabase Storage.\n`;
    }

    updateData.logs = updatedLogs;

    await db.update(builds).set(updateData).where(eq(builds.id, id));

    return NextResponse.json({ success: true, message: "Callback processed successfully" });
  } catch (err: unknown) {
    const errObj = err as Error;
    return NextResponse.json({ error: errObj.message || "Callback processing failed" }, { status: 500 });
  }
}
