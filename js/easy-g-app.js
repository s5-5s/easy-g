import {AppHeader} from "./app-header.js";
import {TopicNavigation} from "./topic-navigation.js";
import {ModelView} from "./model-view.js";
import {getAllTopics, getTopicById} from "./geometry-topics.js";

const APP_SELECTOR = "[data-app]";
const HEADER_SELECTOR = "[data-app-header]";
const NAVIGATION_SELECTOR = "[data-topic-navigation]";
const MODEL_SELECTOR = "[data-model-view]";
const UI_STATE_STORAGE_KEY = "easy-g-ui-state-v2";

class EasyGApp {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {AppHeader} */
    #headerComponent;

    /** @type {TopicNavigation} */
    #navigationComponent;

    /** @type {ModelView} */
    #modelComponent;

    /** @type {Array<object>} */
    #topics = [];

    /** @type {{theme: string, isBookOpen: boolean, activeTopicId: string, isTopicOpen: boolean, isLandscape: boolean}} */
    #state;

    /** @type {(() => void) | undefined} */
    #resizeHandler;

    /** @type {boolean} */
    #initialized = false;

    /**
     * @param {HTMLElement | undefined} appRootElement
     */
    constructor(appRootElement) {
        let appElement = appRootElement instanceof HTMLElement ? appRootElement.querySelector(APP_SELECTOR) : undefined;
        this.#rootElement = appElement instanceof HTMLElement ? appElement : document.createElement("div");
        this.#rootElement.classList.add("app");

        let headerElement = this.#rootElement.querySelector(HEADER_SELECTOR);
        let navigationElement = this.#rootElement.querySelector(NAVIGATION_SELECTOR);
        let modelElement = this.#rootElement.querySelector(MODEL_SELECTOR);

        this.#headerComponent = new AppHeader(
            headerElement instanceof HTMLElement ? headerElement : undefined
        );
        this.#navigationComponent = new TopicNavigation(
            navigationElement instanceof HTMLElement ? navigationElement : undefined
        );
        this.#modelComponent = new ModelView(
            modelElement instanceof HTMLElement ? modelElement : undefined
        );

        this.#topics = [...getAllTopics()];
        let defaultTopicId = this.#topics[0]?.id;
        let persistedState = this.#readPersistedState();

        this.#state = {
            theme: persistedState.theme === "light" ? "light" : "dark",
            isBookOpen: false,
            activeTopicId: this.#resolveTopicIdentifier(
                persistedState.activeTopicId,
                typeof defaultTopicId === "string" ? defaultTopicId : ""
            ),
            isTopicOpen: false,
            isLandscape: this.#readLandscape()
        };

        this.#composeLayout();
    }

    /** @returns {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /** @returns {void} */
    initialize() {
        if (this.#initialized) {
            return;
        }

        this.#headerComponent.initialize();
        this.#navigationComponent.initialize();
        this.#modelComponent.initialize();

        this.#navigationComponent.setTopics(this.#topics);

        this.#headerComponent.onBookToggle(() => {
            this.#state.isBookOpen = !this.#state.isBookOpen;
            this.#state.isTopicOpen = false;
            this.#renderState();
        });

        this.#headerComponent.onThemeToggle(() => {
            this.#state.theme = this.#state.theme === "dark" ? "light" : "dark";
            this.#renderState();
        });

        this.#navigationComponent.onClose(() => {
            this.#state.isBookOpen = false;
            this.#state.isTopicOpen = false;
            this.#renderState();
        });

        this.#navigationComponent.onTopicSelect((topicIdentifier) => {
            if (this.#state.activeTopicId === topicIdentifier && this.#state.isTopicOpen) {
                this.#state.isTopicOpen = false;
            } else {
                this.#state.activeTopicId = topicIdentifier;
                this.#state.isBookOpen = true;
                this.#state.isTopicOpen = true;
            }

            this.#renderState();
        });

        this.#navigationComponent.onDetailToggle(() => {
            this.#state.isTopicOpen = false;
            this.#renderState();
        });

        this.#resizeHandler = () => {
            let nextLandscape = this.#readLandscape();
            if (nextLandscape !== this.#state.isLandscape) {
                this.#state.isLandscape = nextLandscape;
                this.#renderState();
            }
        };

        window.addEventListener("resize", this.#resizeHandler);

        this.#renderState();
        this.#initialized = true;
    }

    /** @returns {void} */
    destroy() {
        if (!this.#initialized) {
            return;
        }

        if (this.#resizeHandler) {
            window.removeEventListener("resize", this.#resizeHandler);
            this.#resizeHandler = undefined;
        }

        this.#modelComponent.destroy();
        this.#saveState();
        this.#initialized = false;
    }

    /** @returns {void} */
    #composeLayout() {
        let stageElement = this.#rootElement.querySelector("[data-model-stage]");
        if (!(stageElement instanceof HTMLElement)) {
            stageElement = document.createElement("section");
            stageElement.className = "model-stage";
            stageElement.dataset.modelStage = "";
        }

        stageElement.replaceChildren(
            this.#modelComponent.element,
            this.#headerComponent.element,
            this.#navigationComponent.element
        );

        this.#rootElement.replaceChildren(stageElement);
    }

    /** @returns {void} */
    #renderState() {
        let currentTopic = getTopicById(this.#state.activeTopicId);

        let isDark = this.#state.theme === "dark";
        this.#rootElement.classList.toggle("theme-dark", isDark);
        this.#rootElement.classList.toggle("theme-light", !isDark);
        this.#rootElement.classList.toggle("is-landscape", this.#state.isLandscape);
        this.#rootElement.classList.toggle("is-portrait", !this.#state.isLandscape);
        this.#rootElement.classList.toggle("is-book-open", this.#state.isBookOpen);
        this.#rootElement.classList.toggle("is-topic-open", this.#state.isTopicOpen);

        document.body.classList.toggle("theme-dark", isDark);
        document.body.classList.toggle("theme-light", !isDark);

        this.#headerComponent.setTheme(this.#state.theme);
        this.#headerComponent.setBookOpen(this.#state.isBookOpen);

        this.#navigationComponent.setOpen(this.#state.isBookOpen);
        this.#navigationComponent.setActiveTopic(this.#state.activeTopicId);
        this.#navigationComponent.setDetailOpen(this.#state.isTopicOpen);

        this.#modelComponent.setTheme(this.#state.theme);
        this.#modelComponent.setTopic(currentTopic);

        this.#saveState();
    }

    /** @returns {boolean} */
    #readLandscape() {
        return window.matchMedia("(orientation: landscape)").matches;
    }

    /**
     * @param {string | undefined} topicIdentifier
     * @param {string} fallbackIdentifier
     * @returns {string}
     */
    #resolveTopicIdentifier(topicIdentifier, fallbackIdentifier) {
        if (typeof topicIdentifier !== "string" || topicIdentifier.length < 1) {
            return fallbackIdentifier;
        }

        let topicExists = this.#topics.some((topicObject) => getString(topicObject, "id") === topicIdentifier);
        return topicExists ? topicIdentifier : fallbackIdentifier;
    }

    /** @returns {{theme?: string, activeTopicId?: string}} */
    #readPersistedState() {
        if (typeof window === "undefined" || !window.localStorage) {
            return {};
        }

        try {
            let savedRaw = window.localStorage.getItem(UI_STATE_STORAGE_KEY);
            if (!savedRaw) {
                return {};
            }

            let parsedValue = JSON.parse(savedRaw);
            if (typeof parsedValue !== "object" || parsedValue === null) {
                return {};
            }

            return parsedValue;
        } catch {
            return {};
        }
    }

    /** @returns {void} */
    #saveState() {
        if (typeof window === "undefined" || !window.localStorage) {
            return;
        }

        try {
            let savedState = {
                theme: this.#state.theme,
                activeTopicId: this.#state.activeTopicId
            };
            window.localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(savedState));
        } catch {
            return;
        }
    }
}

/**
 * @param {object | undefined} sourceObject
 * @param {string} keyName
 * @returns {string}
 */
function getString(sourceObject, keyName) {
    let value = sourceObject?.[keyName];
    return typeof value === "string" ? value : "";
}

export {EasyGApp};
