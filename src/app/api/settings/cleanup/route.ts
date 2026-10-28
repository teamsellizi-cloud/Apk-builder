import { NextResponse } from "next/server";
import { db } from "@/db";
import { builds, appSettings } from "@/db/schema";
import { lt } from "drizzle-orm";
import { deleteArtifact } from "@/lib/storage";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function POST() {
  try {
    const user = await requireAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const settingsList = await db.select().from(appSettings).limit(1);
    const retentionDays = settingsList[0]?.retentionDays || 14;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const expiredBuilds = await db
      .select({ id: builds.id, apkStoragePath: builds.apkStoragePath, zipStoragePath: builds.zipStoragePath })
      .from(builds)
      .where(lt(builds.createdAt, cutoffDate));

    for (const b of expiredBuilds) {
      if (b.apkStoragePath) await deleteArtifact(b.apkStoragePath);
      if (b.zipStoragePath) await deleteArtifact(b.zipStoragePath);
    }

    const deleted = await db.delete(builds).where(lt(builds.createdAt, cutoffDate)).returning({ id: builds.id });

    return NextResponse.json({
      success: true,
      deletedCount: deleted.length,
      message: `Cleaned up ${deleted.length} build artifacts older than ${retentionDays} days.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Cleanup failed" }, { status: 500 });
  }
}
