// Minimal service worker for Residence Hub PWA installability.
// The app is dynamic/auth'd, so we DON'T cache pages or API responses (that
// would serve stale/other-user data). We only satisfy the installability
// requirement and provide a tiny offline fallback for navigations.
const OFFLINE_URL = "/offline";
const CACHE = "rh-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png"]).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for navigations; fall back to the offline page when offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
    );
  }
});
