-- ========================================================
-- devs APK Builder - Supabase Postgres schema
-- Safe to run more than once.
-- The app connects with DATABASE_URL (server side), so tables use
-- RLS with NO public policies: nothing is reachable through Supabase's
-- public API with the anon key.
-- ========================================================

-- 1. Users (single admin account, created on first login)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. App settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    github_repo TEXT,
    github_branch TEXT DEFAULT 'main',
    github_workflow TEXT DEFAULT 'apk-builder.yml',
    keystore_alias TEXT DEFAULT 'apkbuilder-release-key',
    keystore_fingerprint TEXT,
    keystore_configured BOOLEAN DEFAULT false,
    retention_days INTEGER DEFAULT 14,
    callback_secret TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Builds
CREATE TABLE IF NOT EXISTS public.builds (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    app_name TEXT NOT NULL,
    package_id TEXT NOT NULL,
    version_name TEXT DEFAULT '1.0.0' NOT NULL,
    version_code INTEGER DEFAULT 1 NOT NULL,
    build_type TEXT NOT NULL CHECK (build_type IN ('website', 'zip', 'pwa')),
    source_url TEXT,
    zip_file_name TEXT,
    zip_file_size INTEGER,
    zip_storage_path TEXT,
    status TEXT DEFAULT 'pending' NOT NULL
      CHECK (status IN ('pending','queued','validating','building','signing','completed','failed','cancelled')),
    progress_percent INTEGER DEFAULT 0 NOT NULL,
    current_step TEXT,
    error_message TEXT,
    app_icon_url TEXT,
    config_json TEXT NOT NULL,
    manifest_json TEXT,
    logs TEXT DEFAULT '' NOT NULL,
    github_run_id TEXT,
    github_run_url TEXT,
    apk_file_name TEXT,
    apk_file_size INTEGER,
    apk_sha256 TEXT,
    apk_storage_path TEXT,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- 4. Remove old open policies from earlier versions of this file
DROP POLICY IF EXISTS "Allow authenticated owner all actions on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can view their own builds" ON public.builds;
DROP POLICY IF EXISTS "Users can insert their own builds" ON public.builds;
DROP POLICY IF EXISTS "Users can update their own builds" ON public.builds;
DROP POLICY IF EXISTS "Users can delete their own builds" ON public.builds;
DROP POLICY IF EXISTS "Private APK access for owner" ON storage.objects;

-- 5. Lock tables (RLS on, no public policies)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

-- 6. Private storage buckets (accessed with the service role key)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('apk-artifacts', 'apk-artifacts', false, 104857600,
     ARRAY['application/vnd.android.package-archive', 'application/zip']),
    ('zip-sources', 'zip-sources', false, 52428800,
     ARRAY['application/zip', 'application/x-zip-compressed'])
ON CONFLICT (id) DO NOTHING;
