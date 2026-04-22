import {RadomirUi} from "./radomir-ui.js";

const APP_ROOT_SELECTOR = "[data-app-root]";
const SERVICE_WORKER_URL = new URL("../service-worker.js", import.meta.url);

let appRootElement = document.querySelector(APP_ROOT_SELECTOR);

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error) => {
        console.error("Service worker registration failed.", error);
    });
}

if (appRootElement instanceof HTMLElement) {
    let radomirUi = new RadomirUi(appRootElement);
    if (!appRootElement.contains(radomirUi.element)) {
        appRootElement.replaceChildren(radomirUi.element);
    }
    radomirUi.initialize();

    window.addEventListener(
        "beforeunload",
        () => {
            radomirUi.destroy();
        },
        {once: true}
    );
}
