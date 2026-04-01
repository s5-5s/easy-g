const TOPIC_IDENTIFIER_ATTRIBUTE = "data-topic-id";
const TOPIC_SELECTOR = `[${TOPIC_IDENTIFIER_ATTRIBUTE}]`;
const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, label";

class TopicNavigation {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {HTMLElement} */
    #listElement;

    /** @type {HTMLElement} */
    #detailElement;

    /** @type {HTMLButtonElement} */
    #detailTitleButton;

    /** @type {HTMLParagraphElement} */
    #detailDefinitionElement;

    /** @type {HTMLUListElement} */
    #detailPropertiesElement;

    /** @type {HTMLParagraphElement} */
    #detailTheoremElement;

    /** @type {HTMLButtonElement} */
    #closeButton;

    /** @type {Array<object>} */
    #topics = [];

    /** @type {Map<string, object>} */
    #topicsMap = new Map();

    /** @type {string} */
    #activeTopicIdentifier = "";

    /** @type {boolean} */
    #isDetailOpen = false;

    /** @type {(topicIdentifier: string) => void | undefined} */
    #topicSelectHandler;

    /** @type {(() => void) | undefined} */
    #detailToggleHandler;

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

        this.#detailTitleButton.addEventListener("click", () => {
            this.#detailToggleHandler?.();
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

        this.#rootElement.addEventListener("click", (eventObject) => {
            if (!this.#isCompactViewport()) {
                return;
            }

            let targetElement = eventObject.target;
            if (!(targetElement instanceof Element)) {
                return;
            }

            if (targetElement.closest(INTERACTIVE_SELECTOR)) {
                return;
            }

            let isFreeAreaClick =
                targetElement === this.#rootElement ||
                targetElement === this.#listElement ||
                targetElement === this.#detailElement ||
                targetElement.classList.contains("topic-navigation-head") ||
                targetElement.classList.contains("topic-detail-content");
            if (!isFreeAreaClick) {
                return;
            }

            this.#closeHandler?.();
        });

        this.#initialized = true;
    }

    /**
     * @param {Array<object> | undefined} topics
     * @returns {void}
     */
    setTopics(topics) {
        this.#topics = Array.isArray(topics) ? topics : [];
        this.#topicsMap = new Map(
            this.#topics.map((topicObject) => [getString(topicObject, "id"), topicObject])
        );

        this.#render();
        this.#renderDetail();
    }

    /**
     * @param {boolean} isOpen
     * @returns {void}
     */
    setOpen(isOpen) {
        this.#rootElement.classList.toggle("is-open", Boolean(isOpen));
        this.#rootElement.setAttribute("aria-hidden", String(!Boolean(isOpen)));
        this.#rootElement.setAttribute("aria-expanded", String(Boolean(isOpen)));
    }

    /**
     * @param {boolean} isOpen
     * @returns {void}
     */
    setDetailOpen(isOpen) {
        this.#isDetailOpen = Boolean(isOpen);
        this.#rootElement.classList.toggle("is-detail-open", this.#isDetailOpen);
        this.#detailTitleButton.setAttribute("aria-expanded", String(this.#isDetailOpen));
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

        this.#renderDetail();
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
    onDetailToggle(handler) {
        this.#detailToggleHandler = handler;
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
        this.#closeButton.textContent = "☰";
        this.#closeButton.setAttribute("aria-label", "Скрыть список тем");

        headElement.append(this.#closeButton);

        this.#listElement = document.createElement("div");
        this.#listElement.className = "topic-navigation-list";

        this.#detailElement = document.createElement("section");
        this.#detailElement.className = "topic-detail";

        this.#detailTitleButton = document.createElement("button");
        this.#detailTitleButton.type = "button";
        this.#detailTitleButton.className = "topic-detail-title";
        this.#detailTitleButton.setAttribute("aria-expanded", "false");
        this.#detailTitleButton.setAttribute("aria-label", "Вернуться к списку тем");

        let detailContentElement = document.createElement("div");
        detailContentElement.className = "topic-detail-content";

        this.#detailDefinitionElement = document.createElement("p");
        this.#detailDefinitionElement.className = "topic-detail-definition";

        this.#detailPropertiesElement = document.createElement("ul");
        this.#detailPropertiesElement.className = "topic-detail-properties";

        this.#detailTheoremElement = document.createElement("p");
        this.#detailTheoremElement.className = "topic-detail-theorem";

        detailContentElement.append(
            this.#detailDefinitionElement,
            this.#detailPropertiesElement,
            this.#detailTheoremElement
        );

        this.#detailElement.append(this.#detailTitleButton, detailContentElement);

        this.#rootElement.replaceChildren(headElement, this.#listElement, this.#detailElement);
    }

    /** @returns {boolean} */
    #isCompactViewport() {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return false;
        }

        return window.matchMedia("(max-width: 1100px)").matches;
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

    /** @returns {void} */
    #renderDetail() {
        let topicObject = this.#topicsMap.get(this.#activeTopicIdentifier) ?? this.#topics[0];
        let titleText = getString(topicObject, "title");
        let gradeText = getString(topicObject, "grade");
        let detailTitleText = [gradeText, titleText].filter((valueText) => valueText.length > 0).join(" — ");

        this.#detailTitleButton.textContent = detailTitleText || "Тема";
        this.#detailDefinitionElement.textContent = getString(topicObject, "definition");

        this.#detailPropertiesElement.replaceChildren();
        let propertiesValue = Array.isArray(topicObject?.properties) ? topicObject.properties : [];
        propertiesValue.forEach((propertyText) => {
            let itemElement = document.createElement("li");
            itemElement.className = "topic-detail-property";
            itemElement.textContent = String(propertyText);
            this.#detailPropertiesElement.append(itemElement);
        });

        let theoremText = getString(topicObject, "theorem");
        this.#detailTheoremElement.textContent = theoremText;
        this.#detailTheoremElement.hidden = theoremText.length < 1;
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
