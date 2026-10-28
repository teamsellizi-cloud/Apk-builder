"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Database,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Shield,
  Smartphone,
  Sparkles,
  Server,
  GitBranch,
} from "lucide-react";

const GithubIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface SettingsData {
  githubTokenMasked?: string;
  hasGithubToken?: boolean;
  githubRepo?: string;
  githubBranch?: string;
  githubWorkflow?: string;
  keystoreAlias?: string;
  keystoreFingerprint?: string;
  keystoreConfigured?: boolean;
  retentionDays?: number;
}

interface StorageData {
  totalBuilds: number;
  totalSizeMb: string;
}

interface SettingsTabProps {
  onLogout: () => void;
  user: { email: string } | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onLogout, user }) => {
  const [settings, setSettings] = useState<SettingsData>({
    githubRepo: "",
    githubBranch: "main",
    githubWorkflow: "apk-builder.yml",
    keystoreAlias: "apkbuilder-release-key",
    keystoreFingerprint: "",
    keystoreConfigured: false,
    retentionDays: 14,
  });

  const [storage, setStorage] = useState<StorageData>({ totalBuilds: 0, totalSizeMb: "0" });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // GitHub Test State
  const [isTestingGh, setIsTestingGh] = useState(false);
  const [ghTestResult, setGhTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Keystore Generator State
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<{
    alias: string;
    sha256Fingerprint: string;
    suggestedPassword: string;
    fullKeystoreBase64: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Cleanup State
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        if (data.settings) setSettings(data.settings);
        if (data.storage) setStorage(data.storage);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage("Settings saved successfully!");
        fetchSettings();
      }
    } catch {
      setSaveMessage("Failed to save settings.");
    }
  };

  const handleTestGithub = async () => {
    setIsTestingGh(true);
    setGhTestResult(null);

    try {
      const res = await fetch("/api/settings/test-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: settings.githubRepo,
          workflow: settings.githubWorkflow,
        }),
      });
      const data = await res.json();
      setGhTestResult(data);
    } catch {
      setGhTestResult({ valid: false, message: "Network error testing GitHub connection." });
    } finally {
      setIsTestingGh(false);
    }
  };

  const handleGenerateKeystore = async () => {
    setIsGeneratingKey(true);
    try {
      const res = await fetch("/api/settings/generate-keystore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: settings.keystoreAlias }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedKeyResult(data);
        setSettings((prev) => ({
          ...prev,
          keystoreFingerprint: data.sha256Fingerprint,
          keystoreConfigured: true,
        }));
      }
    } catch {
      // Ignore
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRunCleanup = async () => {
    setIsCleaning(true);
    setCleanupMessage(null);
    try {
      const res = await fetch("/api/settings/cleanup", { method: "POST" });
      const data = await res.json();
      setCleanupMessage(data.message || "Cleanup completed.");
      fetchSettings();
    } catch {
      setCleanupMessage("Cleanup failed.");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Runner & Security Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure GitHub Actions cloud runner, Android release keystore signing, and artifact retention.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. GitHub Actions Cloud Runner */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <GithubIcon className="w-5 h-5 text-slate-900 dark:text-white" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  GitHub Actions Runner (Cloud SDK)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Builds run on GitHub’s free Ubuntu runners with full Android SDK 34 & Gradle
                </p>
              </div>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                settings.hasGithubToken && settings.githubRepo
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
              }`}
            >
              {settings.hasGithubToken && settings.githubRepo ? "Cloud Runner Ready" : "Setup Required"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GitHub Repository (owner/repo)
              </label>
              <input
                type="text"
                value={settings.githubRepo || ""}
                onChange={(e) => setSettings({ ...settings, githubRepo: e.target.value.trim() })}
                placeholder="yourusername/apk-builder"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Environment Secret (APP_GITHUB_TOKEN)
              </label>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono flex items-center justify-between">
                <span>{settings.hasGithubToken ? "Configured in Environment" : "Not Set (Set APP_GITHUB_TOKEN in .env)"}</span>
                {settings.hasGithubToken && <Check className="w-4 h-4 text-emerald-500" />}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Branch
              </label>
              <input
                type="text"
                value={settings.githubBranch || "main"}
                onChange={(e) => setSettings({ ...settings, githubBranch: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Workflow Filename
              </label>
              <input
                type="text"
                value={settings.githubWorkflow || "apk-builder.yml"}
                onChange={(e) => setSettings({ ...settings, githubWorkflow: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestGithub}
              disabled={isTestingGh}
              className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isTestingGh ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
              <span>Test GitHub Connection</span>
            </button>

            {ghTestResult && (
              <div
                className={`p-2 rounded-xl text-xs flex items-center gap-1.5 ${
                  ghTestResult.valid
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                }`}
              >
                {ghTestResult.valid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{ghTestResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Android Keystore Signing */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Real Android Keystore & Digital Certificates
                </h3>
                <p className="text-[11px] text-slate-400">
                  Generate cryptographic PKCS#12 / Android Keystores directly in browser
                </p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              RSA 2048-bit + X.509
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Signing Key Alias
              </label>
              <input
                type="text"
                value={settings.keystoreAlias || "apkbuilder-release-key"}
                onChange={(e) => setSettings({ ...settings, keystoreAlias: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Certificate SHA-256 Fingerprint
              </label>
              <input
                type="text"
                readOnly
                value={settings.keystoreFingerprint || "No custom keystore generated yet"}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 text-slate-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Keystore Phone Generator Tool */}
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-slate-900 border border-amber-200/60 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Real Mobile Keystore Generator</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Generates genuine PKCS#12 / Android Keystores compatible with apksigner and Google Play.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateKeystore}
                disabled={isGeneratingKey}
                className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm disabled:opacity-50 shrink-0"
              >
                {isGeneratingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                <span>Generate Keystore</span>
              </button>
            </div>

            {generatedKeyResult && (
              <div className="p-3 rounded-lg bg-slate-950 text-slate-200 text-xs font-mono space-y-2 border border-slate-800">
                <p className="text-emerald-400 font-bold">✓ Generated Real Keystore Credentials:</p>
                <p className="text-[11px]">Alias: {generatedKeyResult.alias}</p>
                <p className="text-[11px]">Password: {generatedKeyResult.suggestedPassword}</p>
                <p className="text-[11px] text-slate-400">{generatedKeyResult.sha256Fingerprint}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400">Base64 for GitHub Secrets (ANDROID_KEYSTORE_BASE64):</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedKeyResult.fullKeystoreBase64);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="p-1 text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? "Copied" : "Copy Base64"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Storage Usage & Retention */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Storage & Artifact Retention
                </h3>
                <p className="text-[11px] text-slate-400">
                  Manage private Supabase / local storage footprint and auto-cleanup policies
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {storage.totalSizeMb} MB used
              </span>
              <p className="text-[10px] text-slate-400">{storage.totalBuilds} build packages</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Auto-Cleanup Artifacts Older Than (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={settings.retentionDays || 14}
                onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value, 10) || 14 })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
              />
            </div>

            <div className="pt-4 sm:pt-0">
              <button
                type="button"
                onClick={handleRunCleanup}
                disabled={isCleaning}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 hover:text-rose-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isCleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Run Retention Cleanup Now</span>
              </button>
            </div>
          </div>

          {cleanupMessage && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{cleanupMessage}</p>
          )}
        </div>

        {/* 4. Single-User Account & Save */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Authenticated Single-User Account
            </p>
            <p className="text-[11px] text-slate-400">
              {user ? user.email : "developer@apkbuilder.dev"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={onLogout}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Sign Out
              </button>
            )}

            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-98 transition-all"
            >
              Save Settings
            </button>
          </div>
        </div>

        {saveMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-center">
            {saveMessage}
          </div>
        )}
      </form>
    </div>
  );
};
