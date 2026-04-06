const DEFAULT_CATALOG_URL = "./cards/index.json";

/**
 * @typedef {{
 *     id: string,
 *     title: string,
 *     description: string,
 *     url: string,
 * }} CardCatalogEntry
 */

/**
 * @param {unknown} value
 * @param {string} fallbackText
 * @returns {string}
 */
function normalizeText(value, fallbackText = "") {
    return typeof value === "string" ? value.trim() || fallbackText : fallbackText;
}

/**
 * @param {unknown} entryDefinition
 * @returns {CardCatalogEntry | undefined}
 */
function normalizeCardCatalogEntry(entryDefinition) {
    if (!entryDefinition || typeof entryDefinition !== "object") {
        return undefined;
    }

    let entryId = normalizeText(entryDefinition.id);
    let entryTitle = normalizeText(entryDefinition.title);
    let entryUrl = normalizeText(entryDefinition.url);

    if (!entryId || !entryTitle || !entryUrl) {
        return undefined;
    }

    return {
        id: entryId,
        title: entryTitle,
        description: normalizeText(entryDefinition.description),
        url: entryUrl,
    };
}

/**
 * @param {unknown} catalogDefinition
 * @returns {CardCatalogEntry[]}
 */
function normalizeCardCatalog(catalogDefinition) {
    let rawItems = Array.isArray(catalogDefinition?.items) ? catalogDefinition.items : [];
    let normalizedItems = [];

    for (let itemIndex = 0; itemIndex < rawItems.length; itemIndex += 1) {
        let normalizedEntry = normalizeCardCatalogEntry(rawItems[itemIndex]);
        if (normalizedEntry) {
            normalizedItems.push(normalizedEntry);
        }
    }

    return normalizedItems;
}

class SideBar {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {HTMLElement | undefined} */
    #listElement;

    /** @type {HTMLElement | undefined} */
    #statusElement;

    /** @type {HTMLElement | undefined} */
    #titleElement;

    /** @type {HTMLTemplateElement | undefined} */
    #itemTemplateElement;

    /** @type {Promise<void> | undefined} */
    #loadingPromise;

    /** @type {CardCatalogEntry[]} */
    #catalogEntries = [];

    /** @type {string | undefined} */
    #openEntryId;

    /** @type {(entry: CardCatalogEntry, isOpen: boolean) => void | undefined} */
    #cardToggleHandler;

    /** @type {(event: MouseEvent) => void} */
    #clickHandlerBound;

    /** @type {boolean} */
    #initialized = false;

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#clickHandlerBound = this.#handleClick.bind(this);
        this.#rootElement =
            rootElement instanceof HTMLElement
                ? rootElement
                : document.createElement("aside");
        this.#rootElement.className = "side-bar";
        this.#rootElement.dataset.sideBar = "";
    }

    /** @returns {Promise<void> | undefined} */
    initialize() {
        if (!this.#rootElement) {
            return undefined;
        }

        if (!this.#initialized) {
            this.#captureElements();
            this.#rootElement.addEventListener("click", this.#clickHandlerBound);
            this.#initialized = true;
        }

        if (this.#loadingPromise || this.#catalogEntries.length > 0) {
            return this.#loadingPromise;
        }

        this.#rootElement.classList.remove("is-error");
        this.#setStatus("Загрузка тем...");
        this.#rootElement.classList.add("is-loading");

        this.#loadingPromise = fetch(DEFAULT_CATALOG_URL)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Catalog request failed: ${response.status}`);
                }

                return response.json();
            })
            .then((catalogDefinition) => {
                this.#catalogEntries = normalizeCardCatalog(catalogDefinition);
                this.#renderEntries();

                if (this.#catalogEntries.length > 0) {
                    this.#setStatus("");
                    this.#setOpenEntry(this.#catalogEntries[0].id, true);
                    return;
                }

                this.#setStatus("Список тем пока пуст.");
            })
            .catch(() => {
                this.#catalogEntries = [];
                this.#renderEntries();
                this.#rootElement?.classList.add("is-error");
                this.#setStatus("Не удалось загрузить список тем.");
            })
            .finally(() => {
                this.#rootElement?.classList.remove("is-loading");
                this.#loadingPromise = undefined;
            });

        return this.#loadingPromise;
    }

    /**
     * @param {(entry: CardCatalogEntry, isOpen: boolean) => void} handler
     * @returns {() => void}
     */
    onCardToggle(handler) {
        this.#cardToggleHandler = handler;

        return () => {
            if (this.#cardToggleHandler === handler) {
                this.#cardToggleHandler = undefined;
            }
        };
    }

    /** @returns {void} */
    destroy() {
        this.#rootElement?.removeEventListener("click", this.#clickHandlerBound);
        this.#rootElement?.classList.remove("is-loading", "is-error");
        this.#loadingPromise = undefined;
        this.#catalogEntries = [];
        this.#openEntryId = undefined;
        this.#cardToggleHandler = undefined;
        this.#initialized = false;
    }

    /** @returns {void} */
    #captureElements() {
        if (!this.#rootElement) {
            return;
        }

        let titleElement = this.#rootElement.querySelector("[data-side-bar-title]");
        if (titleElement instanceof HTMLElement) {
            this.#titleElement = titleElement;
        }

        let listElement = this.#rootElement.querySelector("[data-topic-list]");
        if (listElement instanceof HTMLElement) {
            this.#listElement = listElement;
        }

        let statusElement = this.#rootElement.querySelector("[data-side-bar-status]");
        if (statusElement instanceof HTMLElement) {
            this.#statusElement = statusElement;
        }

        let itemTemplateElement = this.#rootElement.querySelector("[data-topic-item-template]");
        if (itemTemplateElement instanceof HTMLTemplateElement) {
            this.#itemTemplateElement = itemTemplateElement;
        }
    }

    /**
     * @param {MouseEvent} event
     * @returns {void}
     */
    #handleClick(event) {
        if (!this.#rootElement) {
            return;
        }

        let clickTarget = event.target;
        if (!(clickTarget instanceof Element)) {
            return;
        }

        let toggleButton = clickTarget.closest("[data-card-id]");
        if (
            !(toggleButton instanceof HTMLButtonElement)
            || !this.#rootElement.contains(toggleButton)
        ) {
            return;
        }

        let cardId = normalizeText(toggleButton.dataset.cardId);
        if (!cardId) {
            return;
        }

        if (this.#openEntryId === cardId) {
            this.#setOpenEntry(undefined, true);
            return;
        }

        this.#setOpenEntry(cardId, true);
    }

    /**
     * @param {string | undefined} entryId
     * @param {boolean} shouldNotify
     * @returns {void}
     */
    #setOpenEntry(entryId, shouldNotify) {
        let previousEntry = this.#catalogEntries.find((entry) => entry.id === this.#openEntryId);
        this.#openEntryId = entryId;
        this.#renderEntries();

        if (!shouldNotify) {
            return;
        }

        if (previousEntry && previousEntry.id !== entryId) {
            this.#cardToggleHandler?.(previousEntry, false);
        }

        if (!entryId) {
            return;
        }

        let selectedEntry = this.#catalogEntries.find((entry) => entry.id === entryId);
        if (!selectedEntry) {
            return;
        }

        this.#cardToggleHandler?.(selectedEntry, true);
    }

    /** @returns {void} */
    #renderEntries() {
        if (!this.#listElement) {
            return;
        }

        if (this.#catalogEntries.length === 0) {
            this.#listElement.replaceChildren();
            return;
        }

        let topicElements = [];
        for (let entryIndex = 0; entryIndex < this.#catalogEntries.length; entryIndex += 1) {
            topicElements.push(this.#createTopicElement(this.#catalogEntries[entryIndex]));
        }

        this.#listElement.replaceChildren(...topicElements);
    }

    /**
     * @param {CardCatalogEntry} entry
     * @returns {HTMLElement}
     */
    #createTopicElement(entry) {
        let isOpen = this.#openEntryId === entry.id;
        let templateContent = this.#itemTemplateElement?.content.cloneNode(true);
        let topicElement =
            templateContent instanceof DocumentFragment
                ? templateContent.firstElementChild
                : undefined;
        if (!(topicElement instanceof HTMLElement)) {
            return document.createElement("article");
        }

        topicElement.classList.toggle("is-open", isOpen);

        let toggleButton = topicElement.querySelector(".topic-button");
        if (!(toggleButton instanceof HTMLButtonElement)) {
            return topicElement;
        }

        toggleButton.dataset.cardId = entry.id;
        toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");

        let titleElement = topicElement.querySelector(".topic-title");
        if (titleElement instanceof HTMLElement) {
            titleElement.textContent = entry.title;
        }

        let markerElement = topicElement.querySelector(".topic-marker");
        if (markerElement instanceof HTMLElement) {
            markerElement.textContent = isOpen ? "−" : "+";
        }

        let contentElement = topicElement.querySelector(".topic-content");
        if (contentElement instanceof HTMLElement) {
            contentElement.hidden = !isOpen;
        }

        let descriptionElement = topicElement.querySelector(".topic-description");
        if (descriptionElement instanceof HTMLElement) {
            descriptionElement.textContent = entry.description;
        }

        return topicElement;
    }

    /**
     * @param {string} statusText
     * @returns {void}
     */
    #setStatus(statusText = "") {
        if (!this.#statusElement) {
            return;
        }

        this.#statusElement.textContent = normalizeText(statusText);
        this.#statusElement.hidden = this.#statusElement.textContent.length === 0;
    }
}

export {SideBar};
