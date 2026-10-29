import type { AndroidPermissions } from "@/types";

export interface PermissionItem {
  key: keyof AndroidPermissions;
  label: string;
  hint: string;
  group: string;
  locked?: boolean;
}

// Used by the customization form. The GitHub workflow keeps the matching Android permission names.
export const PERMISSION_CATALOG: PermissionItem[] = [
  { key: "internet", label: "Internet access", hint: "INTERNET (required)", group: "Essentials", locked: true },
  { key: "networkState", label: "Network state", hint: "ACCESS_NETWORK_STATE", group: "Essentials" },
  { key: "notifications", label: "Notifications", hint: "POST_NOTIFICATIONS", group: "Essentials" },
  { key: "vibrate", label: "Vibration", hint: "VIBRATE", group: "Essentials" },
  { key: "wakeLock", label: "Keep screen awake", hint: "WAKE_LOCK", group: "Essentials" },

  { key: "camera", label: "Camera", hint: "CAMERA", group: "Media & sensors" },
  { key: "microphone", label: "Microphone", hint: "RECORD_AUDIO", group: "Media & sensors" },
  { key: "audioSettings", label: "Change audio settings", hint: "MODIFY_AUDIO_SETTINGS", group: "Media & sensors" },
  { key: "storage", label: "Files (older Android)", hint: "READ/WRITE_EXTERNAL_STORAGE", group: "Media & sensors" },
  { key: "mediaLibrary", label: "Photos, video & audio", hint: "READ_MEDIA_* (Android 13+)", group: "Media & sensors" },
  { key: "bodySensors", label: "Body sensors", hint: "BODY_SENSORS", group: "Media & sensors" },
  { key: "activityRecognition", label: "Activity recognition", hint: "ACTIVITY_RECOGNITION", group: "Media & sensors" },
  { key: "biometrics", label: "Fingerprint / face unlock", hint: "USE_BIOMETRIC", group: "Media & sensors" },

  { key: "geolocation", label: "Location", hint: "ACCESS_FINE / COARSE_LOCATION", group: "Location & connectivity" },
  { key: "backgroundLocation", label: "Background location", hint: "ACCESS_BACKGROUND_LOCATION", group: "Location & connectivity" },
  { key: "wifiState", label: "Wi-Fi state", hint: "ACCESS_WIFI_STATE", group: "Location & connectivity" },
  { key: "bluetooth", label: "Bluetooth", hint: "BLUETOOTH_CONNECT / SCAN", group: "Location & connectivity" },
  { key: "nfc", label: "NFC", hint: "NFC", group: "Location & connectivity" },

  { key: "contacts", label: "Contacts", hint: "READ/WRITE_CONTACTS", group: "Personal data" },
  { key: "calendar", label: "Calendar", hint: "READ/WRITE_CALENDAR", group: "Personal data" },
  { key: "accounts", label: "Device accounts", hint: "GET_ACCOUNTS", group: "Personal data" },
  { key: "phoneState", label: "Phone state", hint: "READ_PHONE_STATE", group: "Personal data" },
  { key: "callPhone", label: "Make phone calls", hint: "CALL_PHONE", group: "Personal data" },
  { key: "sms", label: "SMS", hint: "SEND / READ / RECEIVE_SMS", group: "Personal data" },

  { key: "foregroundService", label: "Foreground service", hint: "FOREGROUND_SERVICE", group: "System" },
  { key: "bootCompleted", label: "Start on boot", hint: "RECEIVE_BOOT_COMPLETED", group: "System" },
  { key: "exactAlarm", label: "Exact alarms", hint: "SCHEDULE_EXACT_ALARM", group: "System" },
  { key: "overlay", label: "Draw over other apps", hint: "SYSTEM_ALERT_WINDOW", group: "System" },
  { key: "installPackages", label: "Install packages", hint: "REQUEST_INSTALL_PACKAGES", group: "System" },
  { key: "setWallpaper", label: "Set wallpaper", hint: "SET_WALLPAPER", group: "System" },
];
