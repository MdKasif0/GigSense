/**
 * GigSense Service Worker
 *
 * Strategy:
 *   - App shell assets → Network-First with an offline cache fallback
 *   - Navigation requests (page loads) → Network-First with shell fallback
 *   - Evidence uploads and AI API calls → Network-Only (never cached)
 *   - External URLs → Network-Only
 *
 * Private data (IndexedDB) is never touched by the service worker.
 */

const CACHE_NAME = "gigsense-shell-v2";

/** Static assets that form the application shell. */
const SHELL_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept: non-GET requests, external origins, or API / upload routes.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Navigation requests: network-first, fall back to cached shell root.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match("/") )
        .then((r) => r ?? fetch(request))
    );
    return;
  }

  // Static assets: network-first. In particular, Next.js can reuse development
  // asset URLs while their contents change; serving CSS cache-first leaves the
  // UI stuck with an obsolete stylesheet.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful same-origin responses for known asset types.
        if (
          response.ok &&
          url.origin === self.location.origin &&
          (url.pathname.match(/\.(js|css|png|ico|svg|woff2?)$/) ||
            url.pathname === "/manifest.json")
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error()))
  );
});
