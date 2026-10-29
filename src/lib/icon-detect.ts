import { isAllowedUrl } from "@/lib/pwa-analyzer";

const MAX_ICON_BYTES = 1_500_000;
const UA =
  "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 APKBuilder/1.0";

// Fetch with the same SSRF check on every redirect hop.
async function safeFetch(url: string, accept: string, timeoutMs = 6000): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const check = await isAllowedUrl(current);
    if (!check.allowed) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": UA, Accept: accept },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        current = new URL(location, current).toString();
        continue;
      }
      return res.ok ? res : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function sniffMime(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length > 4 && b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return "image/x-icon";
  const head = Buffer.from(b.slice(0, 400)).toString("utf8").toLowerCase();
  if (head.includes("<svg")) return "image/svg+xml";
  return null;
}

export function bytesToImageDataUrl(bytes: Uint8Array): string | null {
  if (bytes.length === 0 || bytes.length > MAX_ICON_BYTES) return null;
  const mime = sniffMime(bytes);
  if (!mime) return null;
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

// Download an image and return it as a data URL (only real images, size limited).
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  const res = await safeFetch(url, "image/*,*/*;q=0.5");
  if (!res) return null;
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > MAX_ICON_BYTES) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  return bytesToImageDataUrl(buf);
}

interface Candidate {
  url: string;
  score: number;
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim();
}

function maxSide(sizes: string): number {
  const nums = [...sizes.matchAll(/(\d+)\s*x\s*(\d+)/gi)].map((m) => Math.max(Number(m[1]), Number(m[2])));
  return nums.length ? Math.max(...nums) : 0;
}

function extScore(url: string): number {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".png")) return 30;
  if (path.endsWith(".webp") || path.endsWith(".jpg") || path.endsWith(".jpeg")) return 20;
  if (path.endsWith(".svg")) return 8;
  if (path.endsWith(".ico")) return 2;
  return 10;
}

function collectFromHtml(html: string, baseUrl: string): { candidates: Candidate[]; manifestUrl: string | null } {
  const candidates: Candidate[] = [];
  let manifestUrl: string | null = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = attr(tag, "rel").toLowerCase();
    const href = attr(tag, "href");
    if (!href) continue;
    let abs: string;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (rel.includes("manifest")) {
      manifestUrl = abs;
      continue;
    }
    if (!rel.includes("icon")) continue;
    const size = maxSide(attr(tag, "sizes")) || (rel.includes("apple-touch-icon") ? 180 : 0);
    const appleBonus = rel.includes("apple-touch-icon") ? 120 : 0;
    candidates.push({ url: abs, score: Math.min(size, 512) + appleBonus + extScore(abs) });
  }
  return { candidates, manifestUrl };
}

async function iconsFromManifest(manifestUrl: string): Promise<Candidate[]> {
  const res = await safeFetch(manifestUrl, "application/manifest+json,application/json,*/*;q=0.5");
  if (!res) return [];
  try {
    const text = await res.text();
    if (text.length > 200_000) return [];
    const manifest = JSON.parse(text) as { icons?: { src?: string; sizes?: string; purpose?: string; type?: string }[] };
    return (manifest.icons || [])
      .filter((i) => i.src && !(i.purpose || "").includes("monochrome"))
      .map((i) => {
        const abs = new URL(i.src as string, manifestUrl).toString();
        const size = maxSide(i.sizes || "");
        const maskable = (i.purpose || "").includes("maskable") ? -40 : 0;
        // Manifest icons are usually the highest quality, so they get a bonus
        return { url: abs, score: Math.min(size, 512) + 150 + extScore(abs) + maskable };
      });
  } catch {
    return [];
  }
}

export async function detectSiteIcon(pageUrl: string, html?: string): Promise<string | null> {
  let source = html;
  if (!source) {
    const res = await safeFetch(pageUrl, "text/html,application/xhtml+xml,*/*;q=0.5");
    source = res ? (await res.text()).slice(0, 600_000) : "";
  }

  const { candidates, manifestUrl } = collectFromHtml(source || "", pageUrl);
  if (manifestUrl) candidates.push(...(await iconsFromManifest(manifestUrl)));
  candidates.push({ url: new URL("/favicon.ico", pageUrl).toString(), score: 0 });

  candidates.sort((a, b) => b.score - a.score);
  const tried = new Set<string>();
  for (const c of candidates) {
    if (tried.has(c.url)) continue;
    tried.add(c.url);
    if (tried.size > 6) break;
    const dataUrl = await fetchImageAsDataUrl(c.url);
    if (dataUrl) return dataUrl;
  }
  return null;
}
