import {SideBar} from "./side-bar.js";
import {Model} from "./model.js";
import {ModelPanel} from "./model-panel.js";

const APP_SELECTOR = "[data-app]";
const MAIN_SELECTOR = "[data-app-main]";
const MODEL_SELECTOR = "[data-model]";
const MODEL_PANEL_SELECTOR = "[data-model-panel]";
const SIDE_BAR_SELECTOR = "[data-side-bar]";

class RadomirUi {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {HTMLElement | undefined} */
    #mainElement;

    /** @type {SideBar | undefined} */
    #sideBar;

    /** @type {Model | undefined} */
    #model;

    /** @type {ModelPanel | undefined} */
    #modelPanel;

    /** @type {(() => void) | undefined} */
    #offCardToggle;

    /** @type {boolean} */
    #initialized = false;

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /**
     * @param {HTMLElement | undefined} appRootElement
     */
    constructor(appRootElement) {
        let appElement =
            appRootElement instanceof HTMLElement
                ? appRootElement.querySelector(APP_SELECTOR)
                : undefined;
        if (appElement instanceof HTMLElement) {
            this.#rootElement = appElement;
        } else {
            this.#rootElement = document.createElement("div");
            this.#rootElement.className = "app";
            this.#rootElement.dataset.app = "";
        }

        let mainElement = this.#rootElement.querySelector(MAIN_SELECTOR);
        if (mainElement instanceof HTMLElement) {
            this.#mainElement = mainElement;
        } else {
            this.#mainElement = document.createElement("main");
            this.#mainElement.className = "main";
            this.#mainElement.dataset.appMain = "";
        }

        let sideBarElement = this.#rootElement.querySelector(SIDE_BAR_SELECTOR);
        let modelElement = this.#rootElement.querySelector(MODEL_SELECTOR);
        let modelPanelElement = this.#rootElement.querySelector(MODEL_PANEL_SELECTOR);

        this.#sideBar = new SideBar(
            sideBarElement instanceof HTMLElement ? sideBarElement : undefined
        );
        this.#model = new Model(modelElement instanceof HTMLElement ? modelElement : undefined);
        this.#modelPanel = new ModelPanel(
            modelPanelElement instanceof HTMLElement ? modelPanelElement : undefined
        );

        this.#composeLayout();
    }

    /** @returns {void} */
    initialize() {
        if (this.#initialized) {
            return;
        }

        this.#offCardToggle = this.#sideBar?.onCardToggle((entry, isOpen) => {
            if (isOpen) {
                this.#model?.loadCard(entry.url);
            }
        });

        this.#model?.initialize();
        this.#sideBar?.initialize();

        this.#initialized = true;
    }

    /** @returns {void} */
    destroy() {
        if (!this.#initialized) {
            return;
        }

        this.#offCardToggle?.();
        this.#sideBar?.destroy();
        this.#model?.destroy();
        this.#initialized = false;
    }

    /** @returns {void} */
    #composeLayout() {
        if (!this.#rootElement || !this.#mainElement) {
            return;
        }

        this.#modelPanel?.attachSideBarElement(this.#sideBar?.element);
        this.#modelPanel?.attachModelElement(this.#model?.element);

        if (this.#modelPanel?.element) {
            this.#mainElement.replaceChildren(this.#modelPanel.element);
        }

        this.#rootElement.replaceChildren(this.#mainElement);
    }
}

export {RadomirUi};
