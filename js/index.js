import {EasyGApp} from "./easy-g-app.js";

const APP_ROOT_SELECTOR = "[data-app-root]";

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
        navigator.serviceWorker.register("./service-worker.js").catch(() => undefined);
    });
}
