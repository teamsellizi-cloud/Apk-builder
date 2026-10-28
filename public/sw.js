const CACHE = "apk-builder-v1";

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#0a1128;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:22px;margin:0 0 8px}p{margin:0;color:#94a3b8}</style></head>
<body><div><h1>You're offline</h1><p>APK Builder needs an internet connection to run builds. Reconnect and try again.</p></div></body></html>`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API calls, login or downloads
  if (url.pathname.startsWith("/api/")) return;

  // Pages: always go to the network, show a friendly page when offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(OFFLINE_HTML, {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
      )
    );
    return;
  }

  // Icons and built static files: cache first
  if (url.pathname.startsWith("/images/") || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
  }
});
