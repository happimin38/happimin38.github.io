/**
 * Offline support.
 *
 * Pages are fetched from the network first so a deploy is picked up on the
 * next visit, falling back to the last cached copy when there is no
 * connection. Records live in localStorage, which the cache never touches,
 * so nothing entered can be lost by clearing it.
 */
const CACHE = "site-v6";

const ASSETS = [
  "./",
  "./index.html",
  "./english.html",
  "./money-input.js",
  "./manifest.json",
  "./manifest-english.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-english-192.png",
  "./icons/icon-english-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // A single missing file must not fail the whole install.
      .then((cache) => Promise.allSettled(ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    // "no-cache" makes the browser revalidate with the server instead of
    // trusting its own HTTP cache. GitHub Pages marks pages max-age=600, so
    // without it a deploy stays invisible for up to ten minutes — and the
    // stale copy was then written into this cache as if it were current.
    // Revalidation is a conditional request, so an unchanged file costs
    // almost nothing.
    fetch(request, { cache: "no-cache" })
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // A deep link opened offline still lands on the home page.
          if (request.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        })
      )
  );
});
