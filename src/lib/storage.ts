import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase Storage credentials missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables for persistent private APK & ZIP storage."
    );
  }

  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function uploadZipToStorage(
  buildId: string,
  fileName: string,
  buffer: Buffer
): Promise<{ storagePath: string; size: number }> {
  const supabase = getSupabaseAdmin();
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const objectPath = `zips/${buildId}-${safeName}`;

  const { error } = await supabase.storage
    .from("zip-sources")
    .upload(objectPath, buffer, {
      contentType: "application/zip",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ZIP to Supabase storage: ${error.message}`);
  }

  return {
    storagePath: `supabase:zip-sources/${objectPath}`,
    size: buffer.length,
  };
}

export async function createApkSignedUploadUrl(
  buildId: string,
  fileName: string
): Promise<{ uploadUrl: string; storagePath: string }> {
  const supabase = getSupabaseAdmin();
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const objectPath = `apks/${buildId}/${safeName}`;

  const { data, error } = await supabase.storage
    .from("apk-artifacts")
    .createSignedUploadUrl(objectPath);

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL for APK: ${error?.message || "Unknown error"}`);
  }

  return {
    uploadUrl: data.signedUrl,
    storagePath: `supabase:apk-artifacts/${objectPath}`,
  };
}

export async function getSignedDownloadUrlForArtifact(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const supabase = getSupabaseAdmin();

  if (storagePath.startsWith("supabase:")) {
    const raw = storagePath.replace("supabase:", "");
    const slashIdx = raw.indexOf("/");
    const bucket = raw.substring(0, slashIdx);
    const objectPath = raw.substring(slashIdx + 1);

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresInSeconds);

    if (error || !data) {
      throw new Error(`Failed to create signed download URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  throw new Error("Invalid storage path format.");
}

export async function downloadArtifactBuffer(storagePath: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();

  if (storagePath.startsWith("supabase:")) {
    const raw = storagePath.replace("supabase:", "");
    const slashIdx = raw.indexOf("/");
    const bucket = raw.substring(0, slashIdx);
    const objectPath = raw.substring(slashIdx + 1);

    const { data, error } = await supabase.storage.from(bucket).download(objectPath);

    if (error || !data) {
      throw new Error(`Failed to download artifact: ${error?.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("Invalid storage path format.");
}

export async function deleteArtifact(storagePath: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getSupabaseAdmin();
    if (storagePath.startsWith("supabase:")) {
      const raw = storagePath.replace("supabase:", "");
      const slashIdx = raw.indexOf("/");
      const bucket = raw.substring(0, slashIdx);
      const objectPath = raw.substring(slashIdx + 1);

      await supabase.storage.from(bucket).remove([objectPath]);
    }
  } catch (err) {
    console.warn("Error deleting storage artifact:", err);
  }
}
