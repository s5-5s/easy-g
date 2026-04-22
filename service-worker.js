const CACHE_VERSION = "easy-g-v20260422-1";
const STATIC_CACHE_NAME = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE_NAME = `${CACHE_VERSION}-runtime`;
const OFFLINE_PAGE_URL = "./index.html";

const CORE_ASSET_URLS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./favicon.ico",
    "./img/UI.ico",
    "./img/apple-touch-icon.png",
    "./img/icon-192.png",
    "./img/icon-512.png",
    "./fonts/europe-ext-normal.woff",
    "./css/layout.css",
    "./css/base.css",
    "./css/vars.css",
    "./css/app-layout.css",
    "./css/model-layout.css",
    "./css/model.css",
    "./css/side-bar-layout.css",
    "./css/side-bar.css",
    "./js/index.js",
    "./js/radomir-ui.js",
    "./js/model-panel.js",
    "./js/model.js",
    "./js/card-engine.js",
    "./js/side-bar.js",
    "./cards/index.json",
    "./cards/perpendicular-planes.json",
    "./cards/angle-between-planes.json",
    "./cards/angle-between-line-and-plane.json",
    "./cards/dihedral-angle.json",
    "./cards/plane-perpendicular-to-intersection-line.json",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE_NAME)
            .then((cache) => {
                let requests = CORE_ASSET_URLS.map((assetUrl) => new Request(assetUrl, {cache: "reload"}));
                return cache.addAll(requests);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName === STATIC_CACHE_NAME || cacheName === RUNTIME_CACHE_NAME) {
                            return Promise.resolve(false);
                        }

                        return caches.delete(cacheName);
                    })
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    let {request} = event;
    if (request.method !== "GET") {
        return;
    }

    let requestUrl = new URL(request.url);
    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    event.respondWith(handleRequest(request));
});

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
    let cachedResponse = await caches.match(request, {ignoreSearch: true});
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        let networkResponse = await fetch(request);
        if (networkResponse.ok) {
            let runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
            runtimeCache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        if (request.mode === "navigate") {
            let offlinePageResponse = await caches.match(OFFLINE_PAGE_URL);
            if (offlinePageResponse) {
                return offlinePageResponse;
            }
        }

        throw error;
    }
}
