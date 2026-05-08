const CACHE_VERSION = "easy-g-v20260508-1";
const STATIC_CACHE_NAME = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE_NAME = `${CACHE_VERSION}-runtime`;
const OFFLINE_PAGE_URL = "./index.html";
const CARD_CATALOG_URL = "./cards/index.json";

const CORE_ASSET_URLS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./img/app-icon.png",
    "./fonts/europe-ext-normal.woff",
    "./css/layout.css",
    "./css/base.css",
    "./css/vars.css",
    "./css/app-layout.css",
    "./css/card-viewer-layout.css",
    "./css/card-viewer.css",
    "./css/side-bar-layout.css",
    "./css/side-bar.css",
    "./js/index.js",
    "./js/app/easy-g-app.js",
    "./js/components/card-viewer-component.js",
    "./js/components/side-bar-component.js",
    "./js/card-engine/camera.js",
    "./js/card-engine/card-engine.js",
    "./js/card-engine/pointer-controls.js",
    "./js/card-engine/renderer.js",
    "./js/card-engine/scene-compiler.js",
    "./js/card-engine/scene-schema.js",
    "./js/card-engine/styles.js",
    "./js/card-engine/vector.js",
    "./js/shared/dom.js",
    "./js/shared/normalize.js",
    CARD_CATALOG_URL,
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        cacheStaticAssets()
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

async function cacheStaticAssets() {
    let cache = await caches.open(STATIC_CACHE_NAME);
    let assetUrls = await buildStaticAssetUrls();
    let requests = assetUrls.map((assetUrl) => new Request(assetUrl, {cache: "reload"}));
    await cache.addAll(requests);
}

async function buildStaticAssetUrls() {
    let cardUrls = await loadCatalogCardUrls();
    return [...new Set([...CORE_ASSET_URLS, ...cardUrls])];
}

async function loadCatalogCardUrls() {
    try {
        let response = await fetch(new Request(CARD_CATALOG_URL, {cache: "reload"}));
        if (!response.ok) {
            return [];
        }

        let catalogDefinition = await response.json();
        return normalizeCatalogCardUrls(catalogDefinition);
    } catch {
        return [];
    }
}

function normalizeCatalogCardUrls(catalogDefinition) {
    let catalogItems = Array.isArray(catalogDefinition?.items) ? catalogDefinition.items : [];
    return catalogItems
        .map((catalogItem) => typeof catalogItem?.url === "string" ? catalogItem.url.trim() : "")
        .filter(Boolean);
}
