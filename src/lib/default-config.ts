import type { AppCustomization } from "@/types";

export function defaultConfig(overrides: Partial<AppCustomization> = {}): AppCustomization {
  return {
    appName: "My App",
    packageId: "com.app.myapp",
    versionName: "1.0.0",
    versionCode: 1,
    splashBgColor: "#0f172a",
    splashShowSpinner: false,
    splashDurationMs: 2000,
    splashImageMode: "icon",
    splashLogoSize: 160,
    statusBarColor: "#1e293b",
    navBarColor: "#0f172a",
    themeColor: "#2563eb",
    orientation: "portrait",
    fullscreen: false,
    cleartextTraffic: false,
    ...overrides,
    permissions: {
      internet: true,
      camera: false,
      geolocation: false,
      storage: false,
      microphone: false,
      notifications: true,
      biometrics: false,
      networkState: true,
      ...(overrides.permissions || {}),
    },
  };
}

// Used when editing an older build: fill any missing fields without changing what was saved.
export function normalizeConfig(saved: Partial<AppCustomization> | null | undefined): AppCustomization {
  return defaultConfig({ ...(saved || {}), permissions: { ...(saved?.permissions || {}) } as AppCustomization["permissions"] });
}
