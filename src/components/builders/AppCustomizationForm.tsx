"use client";

import React, { useRef } from "react";
import { AppCustomization, AndroidPermissions } from "@/types";
import { PERMISSION_CATALOG } from "@/lib/permission-catalog";
import {
  Smartphone,
  Palette,
  Shield,
  Upload,
  ImageIcon,
} from "lucide-react";

interface AppCustomizationFormProps {
  config: AppCustomization;
  onChange: (updated: AppCustomization) => void;
  buildType: "website" | "zip" | "pwa";
}

const PRESET_COLORS = [
  "#2563eb", // Royal Blue
  "#0284c7", // Sky
  "#8b5cf6", // Purple
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#0f172a", // Slate Dark
  "#1e293b", // Navy
];

export const AppCustomizationForm: React.FC<AppCustomizationFormProps> = ({
  config,
  onChange,
  buildType,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splashInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof AppCustomization>(field: K, value: AppCustomization[K]) => {
    onChange({ ...config, [field]: value });
  };

  const updatePermission = (perm: keyof AndroidPermissions, val: boolean) => {
    onChange({
      ...config,
      permissions: {
        ...config.permissions,
        [perm]: val,
      },
    });
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateField("iconDataUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSplashUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      alert("Please choose an image smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        ...config,
        splashImageMode: "custom",
        splashImageDataUrl: reader.result as string,
        splashImageName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const splashMode = config.splashImageMode || "icon";
  const splashPreviewSrc =
    splashMode === "custom" ? config.splashImageDataUrl : splashMode === "icon" ? config.iconDataUrl : undefined;
  const logoSize = config.splashLogoSize || 160;

  const autoGeneratePackageId = (name: string) => {
    const clean = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16);
    return `com.app.${clean || "mobileapp"}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Basic Identity */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>App Identity</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* App Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              App Name *
            </label>
            <input
              type="text"
              value={config.appName}
              onChange={(e) => {
                const val = e.target.value;
                onChange({
                  ...config,
                  appName: val,
                  packageId:
                    config.packageId === "com.app.webapp" || config.packageId === "com.app."
                      ? autoGeneratePackageId(val)
                      : config.packageId,
                });
              }}
              placeholder="e.g. My Great App"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Package ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Package Identifier *
              </label>
              <button
                type="button"
                onClick={() => updateField("packageId", autoGeneratePackageId(config.appName))}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Auto-generate
              </button>
            </div>
            <input
              type="text"
              value={config.packageId}
              onChange={(e) => updateField("packageId", e.target.value.toLowerCase().trim())}
              placeholder="e.g. com.mycompany.app"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Version Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Version Name
            </label>
            <input
              type="text"
              value={config.versionName}
              onChange={(e) => updateField("versionName", e.target.value)}
              placeholder="1.0.0"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Version Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Version Code (Integer)
            </label>
            <input
              type="number"
              min="1"
              value={config.versionCode}
              onChange={(e) => updateField("versionCode", parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* App Icon Upload */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            App Launcher Icon
          </label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
              {config.iconDataUrl ? (
                <img src={config.iconDataUrl} alt="App icon" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">📱</span>
              )}
            </div>

            <div className="flex-1 space-y-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                onChange={handleIconUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Custom Icon</span>
              </button>
              <p className="text-[11px] text-slate-400">The logo found on your site or in your ZIP is filled in automatically. Upload another to replace it. Best: 512x512 PNG.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Colors & Appearance */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Colors & Theme</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Primary Theme Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary Theme Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.themeColor}
                onChange={(e) => updateField("themeColor", e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={config.themeColor}
                onChange={(e) => updateField("themeColor", e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Status Bar Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status Bar Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.statusBarColor}
                onChange={(e) => updateField("statusBarColor", e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={config.statusBarColor}
                onChange={(e) => updateField("statusBarColor", e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Navigation Bar Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nav Bar Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.navBarColor}
                onChange={(e) => updateField("navBarColor", e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={config.navBarColor}
                onChange={(e) => updateField("navBarColor", e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Color Palette Presets */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Quick Palette Presets</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => {
                  updateField("themeColor", col);
                  updateField("statusBarColor", col);
                }}
                style={{ backgroundColor: col }}
                className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 shadow-sm hover:scale-110 transition-transform"
              />
            ))}
          </div>
        </div>

        {/* Orientation & Fullscreen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Screen Orientation
            </label>
            <select
              value={config.orientation}
              onChange={(e) =>
                updateField("orientation", e.target.value as AppCustomization["orientation"])
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
            >
              <option value="portrait">Portrait Only (Standard)</option>
              <option value="default">Auto-Rotate (Sensor)</option>
              <option value="landscape">Landscape Only</option>
              <option value="sensorPortrait">Sensor Portrait</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Fullscreen Mode</p>
              <p className="text-[10px] text-slate-400">Hide Android system bars</p>
            </div>
            <input
              type="checkbox"
              checked={config.fullscreen}
              onChange={(e) => updateField("fullscreen", e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Splash Screen */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <ImageIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>Splash Screen</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: config.splashBgColor }}
            className="w-16 h-24 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden flex items-center justify-center shrink-0 shadow-sm"
          >
            {splashPreviewSrc ? (
              <img
                src={splashPreviewSrc}
                alt="Splash logo"
                style={{ width: `${Math.round((logoSize / 320) * 100 + 18)}%` }}
                className="object-contain"
              />
            ) : (
              <span className="text-[9px] text-slate-400">No logo</span>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ["icon", "App icon"],
                ["custom", "Custom"],
                ["none", "Color only"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateField("splashImageMode", mode)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    splashMode === mode
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {splashMode === "custom" && (
              <div>
                <input
                  ref={splashInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleSplashUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => splashInputRef.current?.click()}
                  className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{config.splashImageName ? "Change splash image" : "Upload splash image"}</span>
                </button>
                {config.splashImageName && (
                  <p className="text-[10px] text-slate-400 mt-1 truncate">{config.splashImageName}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Splash Background Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.splashBgColor}
                onChange={(e) => updateField("splashBgColor", e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={config.splashBgColor}
                onChange={(e) => updateField("splashBgColor", e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Logo Size ({logoSize} dp)
            </label>
            <input
              type="range"
              min={64}
              max={280}
              step={8}
              value={logoSize}
              disabled={splashMode === "none"}
              onChange={(e) => updateField("splashLogoSize", parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 disabled:opacity-40"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Android shows this screen while the app starts and hides it as soon as the app is ready, so its length cannot be set.
        </p>
      </div>

      {/* 3. Android Permissions */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Android Permissions</span>
          <span className="ml-auto text-[10px] font-semibold text-slate-400">
            {PERMISSION_CATALOG.filter((p) => config.permissions[p.key]).length} on
          </span>
        </div>

        {Array.from(new Set(PERMISSION_CATALOG.map((p) => p.group))).map((group) => (
          <div key={group} className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERMISSION_CATALOG.filter((p) => p.group === group).map((p) => (
                <label
                  key={p.key}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{p.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">{p.hint}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={p.locked ? true : Boolean(config.permissions[p.key])}
                    disabled={p.locked}
                    onChange={(e) => updatePermission(p.key, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[11px] text-slate-400">
          Only turn on what your app really needs. Sensitive ones (SMS, calls, install packages, overlay) may be blocked by Google Play.
        </p>
      </div>
    </div>
  );
};
