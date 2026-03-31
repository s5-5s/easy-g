const CACHE_NAME = "easy-g-cache-v1";

const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./service-worker.js",
    "./css/layout.css",
    "./css/vars.css",
    "./css/base.css",
    "./css/app-layout.css",
    "./css/app.css",
    "./css/app-header-layout.css",
    "./css/app-header.css",
    "./css/topic-navigation-layout.css",
    "./css/topic-navigation.css",
    "./css/model-view-layout.css",
    "./css/model-view.css",
    "./css/lesson-panel-layout.css",
    "./css/lesson-panel.css",
    "./js/index.js",
    "./js/easy-g-app.js",
    "./js/app-header.js",
    "./js/topic-navigation.js",
    "./js/model-view.js",
    "./js/lesson-panel.js",
    "./js/geometry-topics.js",
    "./js/geometry-model-factory.js",
    "./js/vendor/three.module.js",
    "./js/vendor/OrbitControls.js",
    "./fonts/europe-ext-normal.woff",
    "./img/icon-192.svg",
    "./img/icon-512.svg"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cacheStorage) => cacheStorage.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheKeys) =>
                Promise.all(
                    cacheKeys
                        .filter((cacheKey) => cacheKey !== CACHE_NAME)
                        .map((cacheKey) => caches.delete(cacheKey))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    let requestObject = event.request;
    let requestUrl = new URL(requestObject.url);

    if (requestObject.method !== "GET" || requestUrl.origin !== self.location.origin) {
        return;
    }

    event.respondWith(cacheFirst(requestObject));
});

async function cacheFirst(requestObject) {
    let cacheMatch = await caches.match(requestObject);
    if (cacheMatch) {
        return cacheMatch;
    }

    try {
        let networkResponse = await fetch(requestObject);
        if (networkResponse && networkResponse.ok) {
            let responseClone = networkResponse.clone();
            let cacheStorage = await caches.open(CACHE_NAME);
            await cacheStorage.put(requestObject, responseClone);
        }

        return networkResponse;
    } catch {
        let fallbackResponse = await caches.match("./index.html");
        if (fallbackResponse) {
            return fallbackResponse;
        }

        return new Response("Offline", {
            status: 503,
            statusText: "Offline"
        });
    }
}
