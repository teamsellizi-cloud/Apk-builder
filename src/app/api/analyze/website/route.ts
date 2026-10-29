import { NextResponse } from "next/server";
import { isAllowedUrl } from "@/lib/pwa-analyzer";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { detectSiteIcon } from "@/lib/icon-detect";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const rate = checkRateLimit(`analyze_web_${user.userId}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute before analyzing more sites." },
        { status: 429 }
      );
    }

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const check = await isAllowedUrl(url);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason || "Invalid URL" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 APKBuilder/1.0",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `Target server returned status ${res.status}`,
      });
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Extract theme color
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    const themeColor = themeColorMatch ? themeColorMatch[1].trim() : "#2563eb";

    // Extract favicon
    let faviconUrl = "";
    const iconMatch =
      html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);

    if (iconMatch && iconMatch[1]) {
      faviconUrl = new URL(iconMatch[1], url).toString();
    } else {
      faviconUrl = new URL("/favicon.ico", url).toString();
    }

    // Download the best icon (manifest / apple-touch / favicon) so it can be built into the APK
    const iconDataUrl = await detectSiteIcon(url, html).catch(() => null);

    // Auto-generate package ID from hostname
    const parsedUrl = new URL(url);
    const hostParts = parsedUrl.hostname.split(".").filter((p) => p !== "www");
    let suggestedPackageId = "com.app.webapp";
    if (hostParts.length >= 2) {
      const topDomain = hostParts[hostParts.length - 1];
      const domainName = hostParts[hostParts.length - 2];
      suggestedPackageId = `com.${domainName}.${topDomain}`.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    } else if (hostParts.length === 1) {
      suggestedPackageId = `com.${hostParts[0]}.app`.toLowerCase().replace(/[^a-z0-9_.]/g, "");
    }

    return NextResponse.json({
      success: true,
      title: title || hostParts[0] || "My Web App",
      themeColor: themeColor.startsWith("#") ? themeColor : "#2563eb",
      faviconUrl,
      iconDataUrl: iconDataUrl || "",
      suggestedPackageId,
      url,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to inspect website",
    });
  }
}
