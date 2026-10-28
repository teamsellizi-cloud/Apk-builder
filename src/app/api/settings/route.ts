import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings, builds } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ensureDefaultUserAndSettings, requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  try {
    await ensureDefaultUserAndSettings();
    const user = await requireAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const settingsList = await db.select().from(appSettings).limit(1);
    const settings = settingsList[0] || {
      id: "default",
      githubRepo: "",
      githubBranch: "main",
      githubWorkflow: "apk-builder.yml",
      keystoreAlias: "apkbuilder-release-key",
      keystoreFingerprint: "",
      keystoreConfigured: false,
      retentionDays: 14,
      callbackSecret: "sec_default",
    };

    const envToken = process.env.APP_GITHUB_TOKEN || process.env.GH_TOKEN || "";
    const envRepo = process.env.APP_GITHUB_REPO || "";

    // Calculate real storage usage from builds
    const storageStats = await db
      .select({
        totalCount: sql<number>`count(*)`,
        totalSizeBytes: sql<number>`coalesce(sum(${builds.apkFileSize}), 0)`,
      })
      .from(builds);

    const count = Number(storageStats[0]?.totalCount || 0);
    const totalBytes = Number(storageStats[0]?.totalSizeBytes || 0);

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        githubRepo: settings.githubRepo || envRepo,
        hasGithubToken: Boolean(envToken),
        githubTokenMasked: envToken ? `${envToken.slice(0, 4)}...${envToken.slice(-4)}` : "",
      },
      storage: {
        totalBuilds: count,
        totalSizeBytes: totalBytes,
        totalSizeMb: (totalBytes / (1024 * 1024)).toFixed(2),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureDefaultUserAndSettings();
    const user = await requireAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await req.json();

    const {
      githubRepo,
      githubBranch,
      githubWorkflow,
      keystoreAlias,
      keystoreFingerprint,
      keystoreConfigured,
      retentionDays,
    } = body;

    const existing = await db.select().from(appSettings).limit(1);
    const updatePayload = {
      githubRepo: githubRepo || "",
      githubBranch: githubBranch || "main",
      githubWorkflow: githubWorkflow || "apk-builder.yml",
      keystoreAlias: keystoreAlias || "apkbuilder-release-key",
      keystoreFingerprint: keystoreFingerprint || "",
      keystoreConfigured: Boolean(keystoreConfigured),
      retentionDays: retentionDays ? parseInt(retentionDays, 10) : 14,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db.update(appSettings).set(updatePayload).where(eq(appSettings.id, existing[0].id));
    } else {
      await db.insert(appSettings).values({
        id: "default",
        callbackSecret: `sec_${Math.random().toString(36).substring(2, 15)}`,
        ...updatePayload,
      });
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Failed to save settings" }, { status: 500 });
  }
}
