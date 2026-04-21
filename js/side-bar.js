const DEFAULT_CATALOG_URL = "./cards/index.json";
const OVERLAY_LAYOUT_MEDIA_QUERY = "(max-width: 1024px), (hover: none) and (pointer: coarse)";

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

    /** @type {HTMLButtonElement | undefined} */
    #toggleButtonElement;

    /** @type {HTMLElement | undefined} */
    #toggleMarkerElement;

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

    /** @type {() => void} */
    #viewportChangeHandlerBound;

    /** @type {MediaQueryList | undefined} */
    #overlayModeMediaQueryList;

    /** @type {boolean} */
    #initialized = false;

    /** @type {boolean} */
    #isCollapsed = false;

    /** @type {boolean} */
    #isOverlayMode = false;

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#clickHandlerBound = this.#handleClick.bind(this);
        this.#viewportChangeHandlerBound = this.#handleViewportChange.bind(this);
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
            this.#setupResponsiveMode();
            this.#initialized = true;
        }

        if (this.#loadingPromise || this.#catalogEntries.length > 0) {
            return this.#loadingPromise;
        }

        this.#setCollapsedState(this.#isOverlayMode);
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
        this.#teardownResponsiveMode();
        this.#rootElement?.classList.remove("is-loading", "is-error");
        this.#loadingPromise = undefined;
        this.#catalogEntries = [];
        this.#openEntryId = undefined;
        this.#cardToggleHandler = undefined;
        this.#setCollapsedState(false);
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

        let toggleButtonElement = this.#rootElement.querySelector("[data-side-bar-toggle]");
        if (toggleButtonElement instanceof HTMLButtonElement) {
            this.#toggleButtonElement = toggleButtonElement;
        }

        let toggleMarkerElement = this.#rootElement.querySelector("[data-side-bar-toggle-marker]");
        if (toggleMarkerElement instanceof HTMLElement) {
            this.#toggleMarkerElement = toggleMarkerElement;
        }

        this.#syncCollapsedState();
    }

    /** @returns {void} */
    #setupResponsiveMode() {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            this.#applyResponsiveMode(false, true);
            return;
        }

        if (this.#overlayModeMediaQueryList) {
            return;
        }

        let mediaQueryList = window.matchMedia(OVERLAY_LAYOUT_MEDIA_QUERY);
        this.#overlayModeMediaQueryList = mediaQueryList;

        if (typeof mediaQueryList.addEventListener === "function") {
            mediaQueryList.addEventListener("change", this.#viewportChangeHandlerBound);
        } else if (typeof mediaQueryList.addListener === "function") {
            mediaQueryList.addListener(this.#viewportChangeHandlerBound);
        }

        this.#applyResponsiveMode(mediaQueryList.matches, true);
    }

    /** @returns {void} */
    #teardownResponsiveMode() {
        let mediaQueryList = this.#overlayModeMediaQueryList;
        if (mediaQueryList) {
            if (typeof mediaQueryList.removeEventListener === "function") {
                mediaQueryList.removeEventListener("change", this.#viewportChangeHandlerBound);
            } else if (typeof mediaQueryList.removeListener === "function") {
                mediaQueryList.removeListener(this.#viewportChangeHandlerBound);
            }
        }

        this.#overlayModeMediaQueryList = undefined;
        this.#isOverlayMode = false;
        this.#rootElement?.classList.remove("is-overlay-mode");
    }

    /** @returns {void} */
    #handleViewportChange() {
        this.#applyResponsiveMode(this.#overlayModeMediaQueryList?.matches === true);
    }

    /**
     * @param {boolean} isOverlayMode
     * @param {boolean} forceUpdate
     * @returns {void}
     */
    #applyResponsiveMode(isOverlayMode, forceUpdate = false) {
        let nextOverlayMode = isOverlayMode === true;
        if (!forceUpdate && this.#isOverlayMode === nextOverlayMode) {
            return;
        }

        this.#isOverlayMode = nextOverlayMode;
        this.#rootElement?.classList.toggle("is-overlay-mode", this.#isOverlayMode);
        this.#setCollapsedState(this.#isOverlayMode);
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

        let sideBarToggleButton = clickTarget.closest("[data-side-bar-toggle]");
        if (
            sideBarToggleButton instanceof HTMLButtonElement
            && this.#rootElement.contains(sideBarToggleButton)
        ) {
            this.#setCollapsedState(!this.#isCollapsed);
            return;
        }

        let sideBarHead = clickTarget.closest(".side-bar-head");
        if (
            this.#isOverlayMode
            && sideBarHead instanceof HTMLElement
            && this.#rootElement.contains(sideBarHead)
        ) {
            this.#setCollapsedState(!this.#isCollapsed);
            return;
        }

        let toggleButton = clickTarget.closest("[data-card-id]");
        if (
            !(toggleButton instanceof HTMLButtonElement)
            || !this.#rootElement.contains(toggleButton)
        ) {
            if (this.#shouldCollapseFromFreeSpaceClick(clickTarget)) {
                this.#setCollapsedState(true);
            }
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
     * @param {Element} clickTarget
     * @returns {boolean}
     */
    #shouldCollapseFromFreeSpaceClick(clickTarget) {
        if (!this.#isOverlayMode || this.#isCollapsed || !this.#rootElement) {
            return false;
        }

        if (clickTarget.closest(".side-bar-head")) {
            return false;
        }

        if (clickTarget.closest(".topic-item")) {
            return false;
        }

        return this.#rootElement.contains(clickTarget);
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
            this.#syncCollapsedState();
            return;
        }

        let topicElements = [];
        for (let entryIndex = 0; entryIndex < this.#catalogEntries.length; entryIndex += 1) {
            topicElements.push(this.#createTopicElement(this.#catalogEntries[entryIndex]));
        }

        this.#listElement.replaceChildren(...topicElements);
        this.#syncCollapsedState();
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
        this.#statusElement.hidden =
            this.#isCollapsed || this.#statusElement.textContent.length === 0;
    }

    /**
     * @param {boolean} isCollapsed
     * @returns {void}
     */
    #setCollapsedState(isCollapsed) {
        this.#isCollapsed = isCollapsed === true;
        this.#syncCollapsedState();
    }

    /** @returns {void} */
    #syncCollapsedState() {
        this.#rootElement?.classList.toggle("is-collapsed", this.#isCollapsed);
        this.#rootElement?.classList.toggle("is-overlay-mode", this.#isOverlayMode);

        if (this.#listElement) {
            this.#listElement.hidden =
                this.#isCollapsed || this.#catalogEntries.length === 0;
        }

        if (this.#statusElement) {
            this.#statusElement.hidden =
                this.#isCollapsed || this.#statusElement.textContent.length === 0;
        }

        if (this.#toggleButtonElement) {
            this.#toggleButtonElement.hidden = !this.#isOverlayMode;
            this.#toggleButtonElement.setAttribute(
                "aria-expanded",
                this.#isCollapsed ? "false" : "true"
            );

            let toggleLabel = this.#isCollapsed
                ? "Открыть темы"
                : "Закрыть темы";
            this.#toggleButtonElement.setAttribute("aria-label", toggleLabel);
            this.#toggleButtonElement.title = toggleLabel;
        }

        if (this.#toggleMarkerElement) {
            this.#toggleMarkerElement.textContent = this.#isCollapsed ? "+" : "−";
        }
    }
}

export {SideBar};
