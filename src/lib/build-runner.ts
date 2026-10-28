import { db } from "@/db";
import { builds, appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppCustomization, BuildType } from "@/types";
import { triggerGitHubBuild } from "./github-actions";
import { generateSignedDownloadToken } from "./signed-urls";
import { createApkSignedUploadUrl, isSupabaseConfigured } from "./storage";

export interface StartBuildParams {
  id: string;
  userId?: string;
  appName: string;
  packageId: string;
  versionName: string;
  versionCode: number;
  buildType: BuildType;
  sourceUrl?: string;
  zipFileName?: string;
  zipFileSize?: number;
  zipStoragePath?: string;
  appIconUrl?: string;
  config: AppCustomization;
  manifestJson?: string;
  originUrl?: string;
}

export async function executeBuildJob(params: StartBuildParams) {
  const {
    id,
    appName,
    packageId,
    versionName,
    versionCode,
    buildType,
    sourceUrl,
    zipStoragePath,
    config,
    originUrl,
  } = params;

  const nowIso = () => new Date().toISOString();
  const formatLog = (level: string, msg: string) => `[${nowIso()}] [${level.toUpperCase()}] ${msg}\n`;

  let currentLogs = formatLog("info", `Build job initialized (ID: ${id})`);
  currentLogs += formatLog("info", `Target: ${appName} (${packageId} v${versionName} code ${versionCode})`);
  currentLogs += formatLog("info", `Method: ${buildType.toUpperCase()} -> Android APK`);

  // 1. Validation
  const packageIdRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
  if (!packageIdRegex.test(packageId)) {
    const errorMsg = `Invalid Package ID format: "${packageId}". Must follow standard reverse domain notation (e.g. com.example.app).`;
    currentLogs += formatLog("error", errorMsg);

    await db
      .update(builds)
      .set({
        status: "failed",
        progressPercent: 0,
        currentStep: "Validation failed",
        errorMessage: errorMsg,
        logs: currentLogs,
        updatedAt: new Date(),
      })
      .where(eq(builds.id, id));
    return;
  }

  // 2. Storage Check
  if (!isSupabaseConfigured()) {
    const errorMsg = "Supabase Storage credentials missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for private APK storage.";
    currentLogs += formatLog("error", errorMsg);

    await db
      .update(builds)
      .set({
        status: "failed",
        progressPercent: 0,
        currentStep: "Storage Configuration Missing",
        errorMessage: errorMsg,
        logs: currentLogs,
        updatedAt: new Date(),
      })
      .where(eq(builds.id, id));
    return;
  }

  // 3. Check Settings & Environment for GitHub runner
  const settingsList = await db.select().from(appSettings).limit(1);
  const settings = settingsList[0];

  const githubToken = process.env.APP_GITHUB_TOKEN || process.env.GH_TOKEN;
  const githubRepo = settings?.githubRepo || process.env.APP_GITHUB_REPO;

  if (!githubToken || !githubRepo) {
    const missingItems: string[] = [];
    if (!githubToken) missingItems.push("GitHub Personal Access Token (APP_GITHUB_TOKEN)");
    if (!githubRepo) missingItems.push("GitHub Repository (Settings or APP_GITHUB_REPO)");

    const errorMsg = `Runner configuration required: Missing ${missingItems.join(" and ")}. Please configure your GitHub repository in Settings or environment variables.`;

    currentLogs += formatLog("error", errorMsg);
    currentLogs += formatLog("warn", "Build halted: Missing runner configuration.");

    await db
      .update(builds)
      .set({
        status: "failed",
        progressPercent: 0,
        currentStep: "GitHub Runner Not Configured",
        errorMessage: errorMsg,
        logs: currentLogs,
        updatedAt: new Date(),
      })
      .where(eq(builds.id, id));
    return;
  }

  // 4. Generate Direct Signed Upload URL for APK Storage
  const apkFileName = `${packageId}-v${versionName}-release.apk`;
  let apkUploadUrl = "";
  let apkStoragePath = "";

  try {
    const uploadUrlData = await createApkSignedUploadUrl(id, apkFileName);
    apkUploadUrl = uploadUrlData.uploadUrl;
    apkStoragePath = uploadUrlData.storagePath;
  } catch (err: unknown) {
    const errObj = err as Error;
    const errorMsg = `Failed to generate signed upload URL for private storage: ${errObj.message}`;
    currentLogs += formatLog("error", errorMsg);

    await db
      .update(builds)
      .set({
        status: "failed",
        progressPercent: 0,
        currentStep: "Storage Upload URL Generation Failed",
        errorMessage: errorMsg,
        logs: currentLogs,
        updatedAt: new Date(),
      })
      .where(eq(builds.id, id));
    return;
  }

  // Update status to preparing
  currentLogs += formatLog("info", `Target runner: GitHub Actions repository "${githubRepo}"`);
  currentLogs += formatLog("info", `Workflow file: ${settings?.githubWorkflow || "apk-builder.yml"}`);

  await db
    .update(builds)
    .set({
      status: "validating",
      progressPercent: 15,
      currentStep: "Validating build configuration and dispatching runner",
      apkFileName,
      apkStoragePath,
      logs: currentLogs,
      updatedAt: new Date(),
    })
    .where(eq(builds.id, id));

  // Build secure callback URL and token
  const callbackUrl = `${originUrl || "http://localhost:3000"}/api/builds/${id}/callback`;
  const callbackToken = settings.callbackSecret;

  // If ZIP build, provide signed download URL for the runner
  let zipDownloadUrl: string | undefined;
  if (buildType === "zip" && zipStoragePath) {
    const { token } = generateSignedDownloadToken(id, 120); // 2 hours
    zipDownloadUrl = `${originUrl || "http://localhost:3000"}/api/builds/${id}/download-zip?token=${token}`;
  }

  // GitHub limits workflow inputs to ~65 KB, so a base64 icon is sent as a signed download link
  let iconDownloadUrl: string | undefined;
  let runnerConfig = config;
  if (typeof config.iconDataUrl === "string" && config.iconDataUrl.startsWith("data:")) {
    const { token: iconToken } = generateSignedDownloadToken(id, 120);
    iconDownloadUrl = `${originUrl || "http://localhost:3000"}/api/builds/${id}/icon?token=${iconToken}`;
    runnerConfig = { ...config, iconDataUrl: undefined };
  }

  // Dispatch build to GitHub Actions
  const ghResult = await triggerGitHubBuild(
    {
      token: githubToken,
      repo: githubRepo,
      branch: settings?.githubBranch || "main",
      workflow: settings?.githubWorkflow || "apk-builder.yml",
    },
    {
      buildId: id,
      buildType,
      appName,
      packageId,
      versionName,
      versionCode,
      sourceUrl,
      zipDownloadUrl,
      iconDownloadUrl,
      apkUploadUrl,
      configJson: JSON.stringify(runnerConfig),
      callbackUrl,
      callbackToken,
    }
  );

  if (ghResult.success) {
    currentLogs += formatLog("success", `GitHub Actions cloud runner dispatched successfully.`);
    currentLogs += formatLog("info", `Cloud Runner URL: ${ghResult.runUrl}`);
    currentLogs += formatLog("info", `Awaiting compilation logs and apksigner verification...`);

    await db
      .update(builds)
      .set({
        status: "building",
        progressPercent: 25,
        currentStep: "Running in GitHub Actions cloud runner (JDK 17 + Android SDK 34)",
        logs: currentLogs,
        githubRunUrl: ghResult.runUrl,
        updatedAt: new Date(),
      })
      .where(eq(builds.id, id));
  } else {
    const dispatchError = `Failed to trigger GitHub Actions runner: ${ghResult.error || "Unknown error"}`;
    currentLogs += formatLog("error", dispatchError);

    await db
      .update(builds)
      .set({
        status: "failed",
        progressPercent: 0,
        currentStep: "Workflow dispatch failed",
        errorMessage: dispatchError,
        logs: currentLogs,
        updatedAt: new Date(),
      })
      .where(eq(builds.id, id));
  }
}
