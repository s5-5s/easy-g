import {EasyGApp} from "./app/easy-g-app.js";

const APP_ROOT_SELECTOR = "[data-app-root]";
const SERVICE_WORKER_URL = new URL("../service-worker.js", import.meta.url);

let appRootElement = document.querySelector(APP_ROOT_SELECTOR);

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error) => {
        console.error("Service worker registration failed.", error);
    });
}

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
