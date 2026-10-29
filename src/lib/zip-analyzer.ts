import JSZip from "jszip";
import { ZipAnalysisResult } from "@/types";
import { bytesToImageDataUrl } from "@/lib/icon-detect";

const MAX_ZIP_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_EXTRACTED_SIZE_BYTES = 250 * 1024 * 1024; // 250MB
const MAX_FILE_COUNT = 5000;
const MAX_COMPRESSION_RATIO = 100; // Compression bomb threshold

export async function analyzeZipBuffer(
  buffer: ArrayBuffer | Buffer,
  fileName: string
): Promise<ZipAnalysisResult> {
  const result: ZipAnalysisResult = {
    fileName,
    fileSize: buffer.byteLength,
    fileCount: 0,
    isSafe: true,
    hasIndexHtml: false,
    hasPackageJson: false,
    packageManager: "none",
    buildScriptDetected: false,
    fileTree: [],
  };

  if (buffer.byteLength > MAX_ZIP_SIZE_BYTES) {
    result.isSafe = false;
    result.error = `ZIP file size (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of 50MB.`;
    return result;
  }

  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(buffer);

    let totalExtractedSize = 0;
    let fileCount = 0;
    const paths: string[] = [];

    // Check every file entry for safety & path traversal
    for (const [relativePath, file] of Object.entries(loadedZip.files)) {
      fileCount++;

      // Strict Path Traversal Check (including URL encoded or Windows variants)
      const decodedPath = decodeURIComponent(relativePath);
      if (
        decodedPath.includes("../") ||
        decodedPath.includes("..\\") ||
        decodedPath.startsWith("/") ||
        decodedPath.startsWith("\\") ||
        decodedPath.includes("/../") ||
        decodedPath.includes("\\..\\")
      ) {
        result.isSafe = false;
        result.error = `Security violation: Path traversal detected in entry "${relativePath}".`;
        return result;
      }

      if (fileCount > MAX_FILE_COUNT) {
        result.isSafe = false;
        result.error = `ZIP contains too many files (> ${MAX_FILE_COUNT}). Please exclude node_modules or large media directories.`;
        return result;
      }

      // Check extracted size and compression ratio
      // @ts-expect-error JSZip internal size property
      const uncompressedSize = file._data ? file._data.uncompressedSize || 0 : 0;
      // @ts-expect-error JSZip internal size property
      const compressedSize = file._data ? file._data.compressedSize || 1 : 1;

      if (compressedSize > 0 && uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO && uncompressedSize > 1024 * 1024) {
        result.isSafe = false;
        result.error = `Security violation: Suspicious compression ratio detected in entry "${relativePath}" (Zip Bomb mitigation).`;
        return result;
      }

      totalExtractedSize += uncompressedSize;

      if (totalExtractedSize > MAX_EXTRACTED_SIZE_BYTES) {
        result.isSafe = false;
        result.error = "Extracted contents exceed 250MB limit (Decompression safety trigger).";
        return result;
      }

      if (!file.dir) {
        paths.push(relativePath);
      }
    }

    result.fileCount = fileCount;
    result.fileTree = paths.slice(0, 50);

    // Check for index.html
    const indexFile = paths.find(
      (p) =>
        p.toLowerCase() === "index.html" ||
        p.toLowerCase().endsWith("/index.html") ||
        p.toLowerCase() === "public/index.html" ||
        p.toLowerCase() === "dist/index.html" ||
        p.toLowerCase() === "www/index.html"
    );

    if (indexFile) {
      result.hasIndexHtml = true;
      result.indexPath = indexFile;
    }

    // Check for lockfiles / package manager
    if (paths.some((p) => p.endsWith("pnpm-lock.yaml"))) {
      result.packageManager = "pnpm";
    } else if (paths.some((p) => p.endsWith("yarn.lock"))) {
      result.packageManager = "yarn";
    } else if (paths.some((p) => p.endsWith("package-lock.json") || p.endsWith("package.json"))) {
      result.packageManager = "npm";
    }

    // Check for package.json
    const packageJsonFile = loadedZip.file("package.json") || loadedZip.file(paths.find((p) => p.endsWith("/package.json")) || "");
    if (packageJsonFile) {
      result.hasPackageJson = true;
      try {
        const contentStr = await packageJsonFile.async("string");
        const pkg = JSON.parse(contentStr);

        const scripts = pkg.scripts || {};
        if (scripts.build) {
          result.buildScriptDetected = true;
          result.buildCommand = `${result.packageManager === "yarn" ? "yarn" : result.packageManager === "pnpm" ? "pnpm" : "npm run"} build`;
        }

        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        if (deps["vite"]) {
          result.frameworkDetected = "Vite App";
          result.distDirDetected = "dist";
        } else if (deps["next"]) {
          result.frameworkDetected = "Next.js (Static Export)";
          result.distDirDetected = "out";
        } else if (deps["astro"]) {
          result.frameworkDetected = "Astro";
          result.distDirDetected = "dist";
        } else if (deps["@angular/core"]) {
          result.frameworkDetected = "Angular";
          result.distDirDetected = "dist";
        } else if (deps["react-scripts"]) {
          result.frameworkDetected = "Create React App";
          result.distDirDetected = "build";
        } else if (deps["vue"]) {
          result.frameworkDetected = "Vue SPA";
          result.distDirDetected = "dist";
        } else if (deps["svelte"] || deps["@sveltejs/kit"]) {
          result.frameworkDetected = "Svelte / SvelteKit";
          result.distDirDetected = "build";
        } else {
          result.frameworkDetected = "Node.js Web App";
        }
      } catch {
        result.frameworkDetected = "Custom Web App";
      }
    } else if (result.hasIndexHtml) {
      result.frameworkDetected = "Static HTML / JavaScript";
    } else {
      result.error =
        "No 'index.html' or 'package.json' found. Ensure your zip contains an index.html file or a standard web project.";
    }

    // Find the project's own logo so the APK uses it as the launcher icon
    const icon = await detectIconInZip(loadedZip, paths).catch(() => null);
    if (icon) {
      result.detectedIconDataUrl = icon.dataUrl;
      result.detectedIconPath = icon.path;
    }
  } catch (err: unknown) {
    const error = err as Error;
    result.isSafe = false;
    result.error = `Failed to parse ZIP archive: ${error.message}`;
  }

  return result;
}


// ---- Icon detection inside the ZIP -------------------------------------------------
const ICON_NAME_RANKS: [RegExp, number][] = [
  [/(^|\/)apple-touch-icon[^/]*\.(png|jpe?g|webp)$/i, 100],
  [/(^|\/)(android-chrome|icon|logo)[-_]?512[^/]*\.(png|jpe?g|webp)$/i, 95],
  [/(^|\/)(android-chrome|icon|logo)[-_]?(384|256|192)[^/]*\.(png|jpe?g|webp)$/i, 85],
  [/(^|\/)(app[-_]?icon|adaptive[-_]?icon|ic_launcher)[^/]*\.(png|jpe?g|webp)$/i, 80],
  [/(^|\/)icon[^/]*\.(png|jpe?g|webp)$/i, 70],
  [/(^|\/)logo[^/]*\.(png|jpe?g|webp)$/i, 60],
  [/(^|\/)favicon[^/]*\.(png|jpe?g|webp)$/i, 40],
  [/(^|\/)favicon\.ico$/i, 10],
];

export async function detectIconInZip(
  zip: JSZip,
  paths: string[]
): Promise<{ dataUrl: string; path: string } | null> {
  const usable = paths.filter((p) => !/(^|\/)(node_modules|\.git|__macosx)\//i.test(p));
  const lower = new Map(usable.map((p) => [p.toLowerCase(), p]));
  const candidates: { path: string; score: number }[] = [];

  // 1) Icons listed in a web manifest
  for (const mp of usable.filter((p) => /(^|\/)(manifest\.json|manifest\.webmanifest|site\.webmanifest)$/i.test(p)).slice(0, 4)) {
    try {
      const text = await zip.file(mp)!.async("string");
      const manifest = JSON.parse(text) as { icons?: { src?: string; sizes?: string; purpose?: string }[] };
      const dir = mp.includes("/") ? mp.slice(0, mp.lastIndexOf("/") + 1) : "";
      for (const icon of manifest.icons || []) {
        if (!icon.src || /^https?:/i.test(icon.src) || (icon.purpose || "").includes("monochrome")) continue;
        const rel = icon.src.replace(/^\.?\//, "");
        const found = lower.get((dir + rel).toLowerCase()) || lower.get(`public/${rel}`.toLowerCase()) || lower.get(rel.toLowerCase());
        if (!found) continue;
        const side = Math.max(...[...(icon.sizes || "").matchAll(/(\d+)\s*x\s*(\d+)/gi)].map((m) => Math.max(+m[1], +m[2])), 0);
        candidates.push({ path: found, score: 110 + Math.min(side, 512) / 8 });
      }
    } catch {
      // ignore broken manifest
    }
  }

  // 2) Common icon file names (shallower paths win ties)
  for (const p of usable) {
    for (const [re, rank] of ICON_NAME_RANKS) {
      if (re.test(p)) {
        candidates.push({ path: p, score: rank - p.split("/").length * 2 });
        break;
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c.path)) continue;
    seen.add(c.path);
    if (seen.size > 5) break;
    try {
      const bytes = await zip.file(c.path)!.async("uint8array");
      const dataUrl = bytesToImageDataUrl(bytes);
      if (dataUrl) return { dataUrl, path: c.path };
    } catch {
      // try next
    }
  }
  return null;
}
