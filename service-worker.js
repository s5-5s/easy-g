const CACHE_NAME = "easy-g-cache-v3";

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
    "./js/index.js",
    "./js/easy-g-app.js",
    "./js/app-header.js",
    "./js/topic-navigation.js",
    "./js/model-view.js",
    "./js/geometry-topics.js",
    "./js/geometry-model-factory.js",
    "./js/vendor/three.module.js",
    "./js/vendor/OrbitControls.js",
    "./img/UI.ico",
    "./fonts/europe-ext-normal.woff"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            let cacheStorage = await caches.open(CACHE_NAME);

            await Promise.allSettled(
                PRECACHE_URLS.map(async (precacheUrl) => {
                    let requestObject = new Request(precacheUrl, {cache: "reload"});
                    let responseObject = await fetch(requestObject);
                    if (responseObject.ok) {
                        await cacheStorage.put(precacheUrl, responseObject);
                    }
                })
            );

            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            let cacheKeys = await caches.keys();
            let cachesToDelete = cacheKeys.filter(
                (cacheKey) => cacheKey.startsWith("easy-g-cache-") && cacheKey !== CACHE_NAME
            );
            await Promise.all(cachesToDelete.map((cacheKey) => caches.delete(cacheKey)));
            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (event) => {
    let requestObject = event.request;
    let requestUrl = new URL(requestObject.url);

    if (requestObject.method !== "GET" || requestUrl.origin !== self.location.origin) {
        return;
    }

    if (requestObject.mode === "navigate") {
        event.respondWith(networkFirst(requestObject));
        return;
    }

    event.respondWith(staleWhileRevalidate(event, requestObject));
});

async function networkFirst(requestObject) {
    let cacheStorage = await caches.open(CACHE_NAME);

    try {
        let networkResponse = await fetch(requestObject);
        if (networkResponse.ok) {
            await cacheStorage.put(requestObject, networkResponse.clone());
        }

        return networkResponse;
    } catch {
        let cachedResponse = await cacheStorage.match(requestObject);
        if (cachedResponse) {
            return cachedResponse;
        }

        let fallbackResponse = await cacheStorage.match("./index.html");
        if (fallbackResponse) {
            return fallbackResponse;
        }

        return new Response("Offline", {
            status: 503,
            statusText: "Offline"
        });
    }
}

async function staleWhileRevalidate(event, requestObject) {
    let cacheStorage = await caches.open(CACHE_NAME);
    let cachedResponse = await cacheStorage.match(requestObject);

    let networkPromise = fetch(requestObject)
        .then(async (networkResponse) => {
            if (networkResponse.ok) {
                await cacheStorage.put(requestObject, networkResponse.clone());
            }

            return networkResponse;
        })
        .catch(() => undefined);

    if (cachedResponse) {
        event.waitUntil(networkPromise);
        return cachedResponse;
    }

    let networkResponse = await networkPromise;
    if (networkResponse) {
        return networkResponse;
    }

    return new Response("Offline", {
        status: 503,
        statusText: "Offline"
    });
}
