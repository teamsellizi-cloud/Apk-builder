// Vector artwork for the app logo, feature icons and PWA install icons.
// Each entry returns an SVG string. The /images/[name] route turns it into a PNG.

const NAVY = "#0a1128";

function wrap(size: number, inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${inner}</svg>`;
}

// ---- App logo / PWA icons -------------------------------------------------
function logo(size: number, variant: "rounded" | "full" | "maskable"): string {
  const radius = variant === "rounded" ? 112 : 0;
  const glyphScale = variant === "maskable" ? 0.82 : 1;
  return wrap(
    size,
    `<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3b82f6"/>
        <stop offset="0.55" stop-color="#1d4ed8"/>
        <stop offset="1" stop-color="${NAVY}"/>
      </linearGradient>
      <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
    <path d="M0 0H512V190Q256 250 0 190Z" fill="url(#shine)" ${
      radius ? `clip-path="inset(0 round ${radius}px)"` : ""
    }/>
    <g transform="translate(256 256) scale(${glyphScale}) translate(-256 -256)">
      <path d="M256 118V300" stroke="#ffffff" stroke-width="46" stroke-linecap="round" fill="none"/>
      <path d="M168 222L256 310L344 222" stroke="#ffffff" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M148 376H364" stroke="#7dd3fc" stroke-width="40" stroke-linecap="round" fill="none"/>
    </g>`
  );
}

// ---- Website icon (globe) --------------------------------------------------
function website(size: number): string {
  return wrap(
    size,
    `<defs>
      <linearGradient id="g" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stop-color="#7dd3fc"/>
        <stop offset="0.5" stop-color="#3b82f6"/>
        <stop offset="1" stop-color="#1e3a8a"/>
      </linearGradient>
    </defs>
    <ellipse cx="256" cy="474" rx="150" ry="14" fill="${NAVY}" opacity="0.14"/>
    <circle cx="256" cy="256" r="196" fill="url(#g)"/>
    <g fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="14" stroke-linecap="round">
      <ellipse cx="256" cy="256" rx="92" ry="196"/>
      <path d="M60 256H452"/>
      <path d="M82 170H430"/>
      <path d="M82 342H430"/>
      <path d="M256 60V452"/>
    </g>
    <ellipse cx="190" cy="140" rx="96" ry="46" fill="#ffffff" opacity="0.22" transform="rotate(-28 190 140)"/>`
  );
}

// ---- ZIP icon (archive with zipper) ----------------------------------------
function zip(size: number): string {
  const teeth = Array.from({ length: 7 }, (_, i) => {
    const x = i % 2 === 0 ? 236 : 262;
    return `<rect x="${x}" y="${150 + i * 28}" width="14" height="18" rx="3" fill="#7c2d12"/>`;
  }).join("");
  return wrap(
    size,
    `<defs>
      <linearGradient id="z" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fcd34d"/>
        <stop offset="1" stop-color="#f97316"/>
      </linearGradient>
    </defs>
    <ellipse cx="256" cy="474" rx="150" ry="14" fill="${NAVY}" opacity="0.14"/>
    <rect x="86" y="150" width="340" height="292" rx="52" fill="url(#z)"/>
    <path d="M86 202Q86 98 190 98H238L270 150H426V202Z" fill="#fbbf24"/>
    <rect x="86" y="150" width="340" height="40" fill="#ffffff" opacity="0.18"/>
    <rect x="230" y="150" width="52" height="292" fill="#fed7aa" opacity="0.55"/>
    ${teeth}
    <rect x="228" y="352" width="56" height="62" rx="16" fill="#7c2d12"/>
    <circle cx="256" cy="384" r="9" fill="#fed7aa"/>`
  );
}

// ---- PWA icon (phone with bolt) ---------------------------------------------
function pwa(size: number): string {
  return wrap(
    size,
    `<defs>
      <linearGradient id="p" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a78bfa"/>
        <stop offset="1" stop-color="#4c1d95"/>
      </linearGradient>
    </defs>
    <ellipse cx="256" cy="476" rx="130" ry="13" fill="${NAVY}" opacity="0.14"/>
    <rect x="146" y="44" width="220" height="424" rx="50" fill="${NAVY}"/>
    <rect x="162" y="70" width="188" height="372" rx="34" fill="url(#p)"/>
    <rect x="226" y="52" width="60" height="8" rx="4" fill="#475569"/>
    <path d="M286 130L196 282H250L232 384L326 228H272Z" fill="#ffffff" stroke="#ffffff" stroke-width="10" stroke-linejoin="round"/>`
  );
}

// ---- Hero (tilted phone with Android head and download badge) --------------
function hero(size: number): string {
  return wrap(
    size,
    `<defs>
      <linearGradient id="s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#38bdf8"/>
        <stop offset="1" stop-color="#1d4ed8"/>
      </linearGradient>
      <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4ade80"/>
        <stop offset="1" stop-color="#16a34a"/>
      </linearGradient>
    </defs>
    <ellipse cx="256" cy="486" rx="150" ry="14" fill="${NAVY}" opacity="0.16"/>
    <g transform="rotate(-8 256 256)">
      <rect x="140" y="30" width="232" height="444" rx="48" fill="${NAVY}"/>
      <rect x="156" y="56" width="200" height="392" rx="34" fill="url(#s)"/>
      <rect x="226" y="40" width="60" height="8" rx="4" fill="#475569"/>
      <path d="M190 262A66 66 0 0 1 322 262Z" fill="#3ddc84"/>
      <circle cx="224" cy="238" r="8" fill="${NAVY}"/>
      <circle cx="288" cy="238" r="8" fill="${NAVY}"/>
      <path d="M206 188L226 216M306 188L286 216" stroke="#3ddc84" stroke-width="9" stroke-linecap="round"/>
      <rect x="190" y="276" width="132" height="14" rx="7" fill="#ffffff" opacity="0.55"/>
      <rect x="214" y="304" width="84" height="14" rx="7" fill="#ffffff" opacity="0.35"/>
    </g>
    <circle cx="396" cy="388" r="84" fill="url(#b)"/>
    <circle cx="396" cy="388" r="84" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="6"/>
    <path d="M396 348V404" stroke="#ffffff" stroke-width="22" stroke-linecap="round"/>
    <path d="M366 380L396 410L426 380" stroke="#ffffff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M360 438H432" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>`
  );
}

export const ART: Record<string, { size: number; svg: (size: number) => string }> = {
  // Images the UI already references
  "app-logo-3d.png": { size: 512, svg: (s) => logo(s, "rounded") },
  "icon-website-3d.png": { size: 256, svg: website },
  "icon-zip-3d.png": { size: 256, svg: zip },
  "icon-pwa-3d.png": { size: 256, svg: pwa },
  "hero-3d-android.png": { size: 512, svg: hero },
  // Install / favicon icons
  "pwa-192.png": { size: 192, svg: (s) => logo(s, "rounded") },
  "pwa-512.png": { size: 512, svg: (s) => logo(s, "rounded") },
  "pwa-maskable-512.png": { size: 512, svg: (s) => logo(s, "maskable") },
  "apple-touch-icon.png": { size: 180, svg: (s) => logo(s, "full") },
  "favicon-32.png": { size: 32, svg: (s) => logo(s, "rounded") },
};
