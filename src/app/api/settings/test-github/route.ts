import { NextResponse } from "next/server";
import { verifyGitHubConfig } from "@/lib/github-actions";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => ({}));
    const envToken = process.env.APP_GITHUB_TOKEN || process.env.GH_TOKEN;
    const token = body.token || envToken;

    const settings = await db.select().from(appSettings).limit(1);
    const repo = body.repo || settings[0]?.githubRepo || process.env.APP_GITHUB_REPO;
    const workflow = body.workflow || settings[0]?.githubWorkflow || "apk-builder.yml";

    if (!token) {
      return NextResponse.json({
        valid: false,
        message: "GitHub Personal Access Token is required. Set APP_GITHUB_TOKEN in your environment.",
      });
    }

    if (!repo) {
      return NextResponse.json({
        valid: false,
        message: "GitHub repository (owner/repo) is required.",
      });
    }

    const check = await verifyGitHubConfig({
      token,
      repo,
      workflow,
    });

    return NextResponse.json(check);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({
      valid: false,
      message: `Failed to test GitHub connection: ${error.message}`,
    });
  }
}
