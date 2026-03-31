import {AppHeader} from "./app-header.js";
import {TopicNavigation} from "./topic-navigation.js";
import {LessonPanel} from "./lesson-panel.js";
import {ModelView} from "./model-view.js";
import {getAllTopics, getTopicById} from "./geometry-topics.js";

const APP_SELECTOR = "[data-app]";
const HEADER_SELECTOR = "[data-app-header]";
const NAVIGATION_SELECTOR = "[data-topic-navigation]";
const MODEL_SELECTOR = "[data-model-view]";
const LESSON_SELECTOR = "[data-lesson-panel]";

class EasyGApp {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {AppHeader} */
    #headerComponent;

    /** @type {TopicNavigation} */
    #navigationComponent;

    /** @type {LessonPanel} */
    #lessonComponent;

    /** @type {ModelView} */
    #modelComponent;

    /** @type {Array<object>} */
    #topics = [];

    /** @type {{theme: string, isBookOpen: boolean, activeTopicId: string, isCardOpen: boolean, isLandscape: boolean}} */
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
        let lessonElement = this.#rootElement.querySelector(LESSON_SELECTOR);

        this.#headerComponent = new AppHeader(
            headerElement instanceof HTMLElement ? headerElement : undefined
        );
        this.#navigationComponent = new TopicNavigation(
            navigationElement instanceof HTMLElement ? navigationElement : undefined
        );
        this.#lessonComponent = new LessonPanel(
            lessonElement instanceof HTMLElement ? lessonElement : undefined
        );
        this.#modelComponent = new ModelView(
            modelElement instanceof HTMLElement ? modelElement : undefined
        );

        this.#topics = [...getAllTopics()];
        let defaultTopicId = this.#topics[0]?.id;

        this.#state = {
            theme: "dark",
            isBookOpen: false,
            activeTopicId: typeof defaultTopicId === "string" ? defaultTopicId : "",
            isCardOpen: false,
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
        this.#lessonComponent.initialize();
        this.#modelComponent.initialize();

        this.#navigationComponent.setTopics(this.#topics);

        this.#headerComponent.onBookToggle(() => {
            this.#state.isBookOpen = !this.#state.isBookOpen;
            this.#renderState();
        });

        this.#headerComponent.onThemeToggle(() => {
            this.#state.theme = this.#state.theme === "dark" ? "light" : "dark";
            this.#renderState();
        });

        this.#navigationComponent.onClose(() => {
            this.#state.isBookOpen = false;
            this.#renderState();
        });

        this.#navigationComponent.onTopicSelect((topicIdentifier) => {
            if (this.#state.activeTopicId === topicIdentifier && this.#state.isCardOpen) {
                this.#state.isCardOpen = false;
            } else {
                this.#state.activeTopicId = topicIdentifier;
                this.#state.isCardOpen = true;
            }

            this.#renderState();
        });

        this.#lessonComponent.onClose(() => {
            this.#state.isCardOpen = false;
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
            this.#navigationComponent.element,
            this.#lessonComponent.element
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

        document.body.classList.toggle("theme-dark", isDark);
        document.body.classList.toggle("theme-light", !isDark);

        this.#headerComponent.setTheme(this.#state.theme);
        this.#headerComponent.setBookOpen(this.#state.isBookOpen);

        this.#navigationComponent.setOpen(this.#state.isBookOpen);
        this.#navigationComponent.setActiveTopic(this.#state.activeTopicId);

        this.#lessonComponent.setOpen(this.#state.isCardOpen);
        this.#lessonComponent.setBookOpen(this.#state.isBookOpen);
        this.#lessonComponent.setTopic(currentTopic);

        this.#modelComponent.setTheme(this.#state.theme);
        this.#modelComponent.setTopic(currentTopic);
    }

    /** @returns {boolean} */
    #readLandscape() {
        return window.matchMedia("(orientation: landscape)").matches;
    }
}

export {EasyGApp};
