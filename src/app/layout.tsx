import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "devs APK Builder - Web, ZIP & PWA to Android APK",
  description: "Turn web content into real, signed, installable Android APKs directly from your Android phone browser.",
  applicationName: "APK Builder",
  appleWebApp: {
    capable: true,
    title: "APK Builder",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/images/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/pwa-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-500 selection:text-white dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
