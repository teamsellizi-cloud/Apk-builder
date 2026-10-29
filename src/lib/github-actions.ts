import { GitHubConfig } from "@/types";

export interface TriggerWorkflowParams {
  buildId: string;
  buildType: string;
  appName: string;
  packageId: string;
  versionName: string;
  versionCode: number;
  sourceUrl?: string;
  zipDownloadUrl?: string;
  assetsDownloadUrl?: string;
  apkUploadUrl: string;
  configJson: string;
  callbackUrl: string;
  callbackToken: string;
}

export async function verifyGitHubConfig(config: GitHubConfig): Promise<{
  valid: boolean;
  message: string;
  workflowFound?: boolean;
}> {
  const token = config.token || process.env.APP_GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = config.repo || process.env.APP_GITHUB_REPO;

  if (!token) {
    return { valid: false, message: "GitHub Personal Access Token is required." };
  }
  if (!repo || !repo.includes("/")) {
    return { valid: false, message: "Invalid repository format. Must be 'owner/repo'." };
  }

  const [owner, repoName] = repo.split("/");

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "devs-apk-builder",
      },
    });

    if (res.status === 401) {
      return { valid: false, message: "Authentication failed. Check your GitHub PAT permissions (repo + workflow)." };
    }
    if (res.status === 404) {
      return { valid: false, message: `Repository '${owner}/${repoName}' not found or PAT lacks access.` };
    }
    if (!res.ok) {
      return { valid: false, message: `GitHub API error: ${res.statusText} (${res.status})` };
    }

    const workflowFile = config.workflow || "apk-builder.yml";
    const wfRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowFile}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "devs-apk-builder",
        },
      }
    );

    const workflowFound = wfRes.ok;

    return {
      valid: true,
      message: `Connected successfully to ${owner}/${repoName}${
        workflowFound ? ` (Found workflow ${workflowFile})` : ` (Workflow .github/workflows/${workflowFile} not committed yet)`
      }`,
      workflowFound,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return { valid: false, message: `Network error connecting to GitHub: ${error.message}` };
  }
}

export async function triggerGitHubBuild(
  config: GitHubConfig,
  params: TriggerWorkflowParams
): Promise<{ success: boolean; error?: string; runUrl?: string }> {
  const token = config.token || process.env.APP_GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = config.repo || process.env.APP_GITHUB_REPO;

  if (!token || !repo) {
    return { success: false, error: "GitHub Actions runner (Token and Repository) is not configured." };
  }

  const [owner, repoName] = repo.split("/");
  const workflowFile = config.workflow || "apk-builder.yml";
  const branch = config.branch || "main";

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "devs-apk-builder",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: branch,
          inputs: {
            build_id: params.buildId,
            build_type: params.buildType,
            app_name: params.appName,
            package_id: params.packageId,
            version_name: params.versionName,
            version_code: String(params.versionCode),
            source_url: params.sourceUrl || "",
            zip_download_url: params.zipDownloadUrl || "",
            assets_download_url: params.assetsDownloadUrl || "",
            apk_upload_url: params.apkUploadUrl,
            config_json: params.configJson,
            callback_url: params.callbackUrl,
            callback_token: params.callbackToken,
          },
        }),
      }
    );

    if (res.status === 204 || res.ok) {
      return {
        success: true,
        runUrl: `https://github.com/${owner}/${repoName}/actions`,
      };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      error: (errData as { message?: string }).message || `GitHub returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}
