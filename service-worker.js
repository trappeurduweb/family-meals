const CACHE_NAME = "menu-famille-v6";
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./css/app.css",
  "./js/app.js",
  "./js/db.js",
  "./js/cloud.js",
  "./js/claude.js",
  "./js/utils.js",
  "./js/screens/home.js",
  "./js/screens/household.js",
  "./js/screens/recipes.js",
  "./js/screens/settings.js",
  "./js/screens/menu.js",
  "./js/screens/shopping-list.js",
  "./js/screens/add-receipt.js",
  "./js/screens/add-meal.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          APP_SHELL.map((url) =>
            fetch(url, { cache: "reload" }).then((response) => cache.put(url, response))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") {
    return; // laisse passer les appels API (Claude) et tout le reste au réseau
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
