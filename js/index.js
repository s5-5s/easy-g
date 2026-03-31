import {EasyGApp} from "./easy-g-app.js";

const APP_ROOT_SELECTOR = "[data-app-root]";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

let appRootElement = document.querySelector(APP_ROOT_SELECTOR);

if (appRootElement instanceof HTMLElement) {
    let easyGApp = new EasyGApp(appRootElement);

    if (!appRootElement.contains(easyGApp.element)) {
        appRootElement.replaceChildren(easyGApp.element);
    }

    easyGApp.initialize();

    window.addEventListener(
        "beforeunload",
        () => {
            easyGApp.destroy();
        },
        {once: true}
    );
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        if (isLocalHost()) {
            unregisterServiceWorkersInDevelopment().catch(() => undefined);
            return;
        }

        navigator.serviceWorker.register("./service-worker.js").catch(() => undefined);
    });
}

function isLocalHost() {
    return LOCAL_HOSTNAMES.has(window.location.hostname);
}

async function unregisterServiceWorkersInDevelopment() {
    let registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registrationObject) => registrationObject.unregister()));

    if (typeof window.caches === "undefined") {
        return;
    }

    let cacheKeys = await window.caches.keys();
    await Promise.all(
        cacheKeys
            .filter((cacheKey) => cacheKey.startsWith("easy-g-cache-"))
            .map((cacheKey) => window.caches.delete(cacheKey))
    );
}
