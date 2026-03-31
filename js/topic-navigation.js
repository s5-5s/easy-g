const TOPIC_IDENTIFIER_ATTRIBUTE = "data-topic-id";
const TOPIC_SELECTOR = `[${TOPIC_IDENTIFIER_ATTRIBUTE}]`;

class TopicNavigation {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {HTMLElement} */
    #listElement;

    /** @type {HTMLButtonElement} */
    #closeButton;

    /** @type {Array<object>} */
    #topics = [];

    /** @type {string} */
    #activeTopicIdentifier = "";

    /** @type {(topicIdentifier: string) => void | undefined} */
    #topicSelectHandler;

    /** @type {(() => void) | undefined} */
    #closeHandler;

    /** @type {boolean} */
    #initialized = false;

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : document.createElement("aside");
        this.#rootElement.classList.add("topic-navigation");
        this.#compose();
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

        this.#closeButton.addEventListener("click", () => {
            this.#closeHandler?.();
        });

        this.#listElement.addEventListener("click", (eventObject) => {
            let targetElement = eventObject.target;
            if (!(targetElement instanceof Element)) {
                return;
            }

            let buttonElement = targetElement.closest(TOPIC_SELECTOR);
            if (!(buttonElement instanceof HTMLButtonElement)) {
                return;
            }

            let topicIdentifier = buttonElement.getAttribute(TOPIC_IDENTIFIER_ATTRIBUTE);
            if (!topicIdentifier) {
                return;
            }

            this.#topicSelectHandler?.(topicIdentifier);
        });

        this.#initialized = true;
    }

    /**
     * @param {Array<object> | undefined} topics
     * @returns {void}
     */
    setTopics(topics) {
        this.#topics = Array.isArray(topics) ? topics : [];
        this.#render();
    }

    /**
     * @param {boolean} isOpen
     * @returns {void}
     */
    setOpen(isOpen) {
        this.#rootElement.classList.toggle("is-open", Boolean(isOpen));
        this.#rootElement.setAttribute("aria-hidden", String(!Boolean(isOpen)));
    }

    /**
     * @param {string | undefined} topicIdentifier
     * @returns {void}
     */
    setActiveTopic(topicIdentifier) {
        this.#activeTopicIdentifier = typeof topicIdentifier === "string" ? topicIdentifier : "";

        let topicButtons = this.#listElement.querySelectorAll(TOPIC_SELECTOR);
        topicButtons.forEach((topicButton) => {
            if (!(topicButton instanceof HTMLButtonElement)) {
                return;
            }

            let isActive = topicButton.getAttribute(TOPIC_IDENTIFIER_ATTRIBUTE) === this.#activeTopicIdentifier;
            topicButton.classList.toggle("is-active", isActive);
            topicButton.setAttribute("aria-pressed", String(isActive));
        });
    }

    /**
     * @param {(topicIdentifier: string) => void | undefined} handler
     * @returns {void}
     */
    onTopicSelect(handler) {
        this.#topicSelectHandler = handler;
    }

    /**
     * @param {(() => void) | undefined} handler
     * @returns {void}
     */
    onClose(handler) {
        this.#closeHandler = handler;
    }

    /** @returns {void} */
    #compose() {
        let headElement = document.createElement("div");
        headElement.className = "topic-navigation-head";

        this.#closeButton = document.createElement("button");
        this.#closeButton.type = "button";
        this.#closeButton.className = "topic-close";
        this.#closeButton.textContent = "✕";
        this.#closeButton.setAttribute("aria-label", "Закрыть список тем");

        headElement.append(this.#closeButton);

        this.#listElement = document.createElement("div");
        this.#listElement.className = "topic-navigation-list";

        this.#rootElement.replaceChildren(headElement, this.#listElement);
    }

    /** @returns {void} */
    #render() {
        this.#listElement.replaceChildren();

        this.#topics.forEach((topicObject) => {
            let topicButton = document.createElement("button");
            topicButton.type = "button";
            topicButton.className = "topic-entry";
            topicButton.setAttribute(TOPIC_IDENTIFIER_ATTRIBUTE, getString(topicObject, "id"));
            topicButton.setAttribute("aria-pressed", "false");
            topicButton.setAttribute(
                "aria-label",
                `Открыть карточку темы ${getString(topicObject, "title") || "геометрия"}`
            );

            let gradeElement = document.createElement("span");
            gradeElement.className = "topic-entry-grade";
            gradeElement.textContent = getString(topicObject, "grade");

            let titleElement = document.createElement("span");
            titleElement.className = "topic-entry-title";
            titleElement.textContent = getString(topicObject, "title");

            topicButton.append(gradeElement, titleElement);
            this.#listElement.append(topicButton);
        });

        this.setActiveTopic(this.#activeTopicIdentifier);
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

export {TopicNavigation};
