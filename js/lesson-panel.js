class LessonPanel {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {HTMLButtonElement} */
    #closeButton;

    /** @type {HTMLHeadingElement} */
    #titleElement;

    /** @type {HTMLParagraphElement} */
    #definitionElement;

    /** @type {HTMLUListElement} */
    #propertiesElement;

    /** @type {HTMLParagraphElement} */
    #theoremElement;

    /** @type {(() => void) | undefined} */
    #closeHandler;

    /** @type {boolean} */
    #initialized = false;

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : document.createElement("aside");
        this.#rootElement.classList.add("lesson-panel");
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

        this.#initialized = true;
    }

    /**
     * @param {(() => void) | undefined} handler
     * @returns {void}
     */
    onClose(handler) {
        this.#closeHandler = handler;
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
     * @param {boolean} isBookOpen
     * @returns {void}
     */
    setBookOpen(isBookOpen) {
        this.#rootElement.classList.toggle("is-book-closed", !Boolean(isBookOpen));
    }

    /**
     * @param {object | undefined} topicObject
     * @returns {void}
     */
    setTopic(topicObject) {
        this.#titleElement.textContent = getString(topicObject, "title");
        this.#definitionElement.textContent = getString(topicObject, "definition");

        this.#propertiesElement.replaceChildren();
        let propertiesValue = Array.isArray(topicObject?.properties) ? topicObject.properties : [];
        propertiesValue.forEach((propertyItem) => {
            let itemElement = document.createElement("li");
            itemElement.className = "lesson-property";
            itemElement.textContent = String(propertyItem);
            this.#propertiesElement.append(itemElement);
        });

        let theoremText = getString(topicObject, "theorem");
        this.#theoremElement.textContent = theoremText;
        this.#theoremElement.hidden = theoremText.length < 1;
    }

    /** @returns {void} */
    #compose() {
        let headElement = document.createElement("div");
        headElement.className = "lesson-panel-head";

        this.#closeButton = document.createElement("button");
        this.#closeButton.type = "button";
        this.#closeButton.className = "card-close";
        this.#closeButton.textContent = "✕";
        this.#closeButton.setAttribute("aria-label", "Закрыть карточку темы");
        headElement.append(this.#closeButton);

        this.#titleElement = document.createElement("h2");
        this.#titleElement.className = "lesson-title";

        this.#definitionElement = document.createElement("p");
        this.#definitionElement.className = "lesson-definition";

        this.#propertiesElement = document.createElement("ul");
        this.#propertiesElement.className = "lesson-properties";

        this.#theoremElement = document.createElement("p");
        this.#theoremElement.className = "lesson-theorem";

        this.#rootElement.replaceChildren(
            headElement,
            this.#titleElement,
            this.#definitionElement,
            this.#propertiesElement,
            this.#theoremElement
        );
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

export {LessonPanel};
