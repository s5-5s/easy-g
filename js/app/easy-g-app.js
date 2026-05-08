import {findElement} from "../shared/dom.js";
import {CardViewerComponent} from "../components/card-viewer-component.js";
import {SideBarComponent} from "../components/side-bar-component.js";

const APP_SELECTOR = "[data-app]";
const MAIN_SELECTOR = "[data-app-main]";
const WORKSPACE_SELECTOR = "[data-easy-g-workspace]";
const SIDE_BAR_SELECTOR = "[data-side-bar]";
const CARD_VIEWER_SELECTOR = "[data-card-viewer]";

class EasyGApp {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {HTMLElement} */
    #mainElement;

    /** @type {HTMLElement} */
    #workspaceElement;

    /** @type {HTMLElement} */
    #sideBarHostElement;

    /** @type {HTMLElement} */
    #cardViewerHostElement;

    /** @type {SideBarComponent} */
    #sideBar;

    /** @type {CardViewerComponent} */
    #cardViewer;

    /** @type {(() => void) | undefined} */
    #offCardSelect;

    /** @type {boolean} */
    #initialized = false;

    get element() {
        return this.#rootElement;
    }

    constructor(appRootElement) {
        this.#rootElement = this.#findOrCreateRoot(appRootElement);
        this.#mainElement = this.#findOrCreateMain();
        this.#workspaceElement = this.#findOrCreateWorkspace();
        this.#sideBarHostElement = this.#findOrCreateHost("side-bar-host");
        this.#cardViewerHostElement = this.#findOrCreateHost("card-viewer-host");
        this.#sideBar = new SideBarComponent(findElement(this.#rootElement, SIDE_BAR_SELECTOR));
        this.#cardViewer = new CardViewerComponent(findElement(this.#rootElement, CARD_VIEWER_SELECTOR));
        this.#composeLayout();
    }

    initialize() {
        if (this.#initialized) {
            return;
        }

        this.#offCardSelect = this.#sideBar.onCardSelect((entry) => {
            this.#cardViewer.loadCard(entry.url);
        });
        this.#cardViewer.initialize();
        this.#sideBar.initialize();
        this.#initialized = true;
    }

    destroy() {
        if (!this.#initialized) {
            return;
        }

        this.#offCardSelect?.();
        this.#sideBar.destroy();
        this.#cardViewer.destroy();
        this.#initialized = false;
    }

    #findOrCreateRoot(appRootElement) {
        let appElement = appRootElement instanceof HTMLElement
            ? findElement(appRootElement, APP_SELECTOR)
            : undefined;
        return appElement || this.#createElement("div", "app", "app");
    }

    #findOrCreateMain() {
        return findElement(this.#rootElement, MAIN_SELECTOR)
            || this.#createElement("main", "main", "appMain");
    }

    #findOrCreateWorkspace() {
        return findElement(this.#rootElement, WORKSPACE_SELECTOR)
            || this.#createElement("section", "workspace", "easyGWorkspace");
    }

    #findOrCreateHost(className) {
        return findElement(this.#workspaceElement, `.${className}`)
            || this.#createElement("div", className);
    }

    #createElement(tagName, className, datasetKey = "") {
        let element = document.createElement(tagName);
        element.className = className;
        if (datasetKey) {
            element.dataset[datasetKey] = "";
        }

        return element;
    }

    #composeLayout() {
        this.#sideBarHostElement.replaceChildren(this.#sideBar.element);
        this.#cardViewerHostElement.replaceChildren(this.#cardViewer.element);
        this.#workspaceElement.replaceChildren(this.#sideBarHostElement, this.#cardViewerHostElement);
        this.#mainElement.replaceChildren(this.#workspaceElement);
        this.#rootElement.replaceChildren(this.#mainElement);
    }
}

export {EasyGApp};
