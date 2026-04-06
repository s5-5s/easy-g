import {RadomirUi} from "./radomir-ui.js";

const APP_ROOT_SELECTOR = "[data-app-root]";

let appRootElement = document.querySelector(APP_ROOT_SELECTOR);

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
