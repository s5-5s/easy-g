import {createElement, findButton, findElement, findTemplate} from "../shared/dom.js";
import {normalizeText} from "../shared/normalize.js";

const DEFAULT_CATALOG_URL = "./cards/index.json";
const OVERLAY_LAYOUT_MEDIA_QUERY = "(max-width: 1024px), (hover: none) and (pointer: coarse)";

function buildFallbackCardId(cardUrl) {
    return cardUrl.split("/").pop()?.replace(/\.json$/u, "") || cardUrl;
}

function normalizeCatalogEntry(entryDefinition) {
    if (!entryDefinition || typeof entryDefinition !== "object") {
        return undefined;
    }

    let cardUrl = normalizeText(entryDefinition.url);
    if (!cardUrl) {
        return undefined;
    }

    return {
        description: normalizeText(entryDefinition.description),
        id: normalizeText(entryDefinition.id, buildFallbackCardId(cardUrl)),
        title: normalizeText(entryDefinition.title),
        url: cardUrl,
    };
}

function normalizeCatalog(catalogDefinition) {
    let rawItems = Array.isArray(catalogDefinition?.items) ? catalogDefinition.items : [];
    return rawItems.map((entryDefinition) => normalizeCatalogEntry(entryDefinition)).filter(Boolean);
}

class SideBarComponent {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {HTMLElement | undefined} */
    #listElement;

    /** @type {HTMLElement | undefined} */
    #statusElement;

    /** @type {HTMLElement | undefined} */
    #panelElement;

    /** @type {HTMLTemplateElement | undefined} */
    #itemTemplateElement;

    /** @type {HTMLButtonElement | undefined} */
    #toggleButtonElement;

    /** @type {HTMLElement | undefined} */
    #toggleMarkerElement;

    /** @type {Promise<void> | undefined} */
    #loadingPromise;

    /** @type {Array<{id: string, title: string, description: string, url: string}>} */
    #catalogEntries = [];

    /** @type {string | undefined} */
    #openCardId;

    /** @type {(entry: {id: string, title: string, description: string, url: string}) => void | undefined} */
    #cardSelectHandler;

    /** @type {MediaQueryList | undefined} */
    #overlayModeMediaQueryList;

    /** @type {boolean} */
    #initialized = false;

    /** @type {boolean} */
    #isCollapsed = false;

    /** @type {boolean} */
    #isOverlayMode = false;

    /** @type {(event: MouseEvent) => void} */
    #clickHandlerBound = this.#handleClick.bind(this);

    /** @type {() => void} */
    #viewportChangeHandlerBound = this.#handleViewportChange.bind(this);

    get element() {
        return this.#rootElement;
    }

    constructor(rootElement) {
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : this.#createRootElement();
        this.#rootElement.className = "side-bar";
        this.#rootElement.dataset.sideBar = "";
    }

    initialize() {
        if (!this.#initialized) {
            this.#captureElements();
            this.#rootElement.addEventListener("click", this.#clickHandlerBound);
            this.#setupResponsiveMode();
            this.#initialized = true;
        }

        if (this.#loadingPromise || this.#catalogEntries.length > 0) {
            return this.#loadingPromise;
        }

        return this.#loadCatalog();
    }

    onCardSelect(handler) {
        this.#cardSelectHandler = handler;
        return () => {
            if (this.#cardSelectHandler === handler) {
                this.#cardSelectHandler = undefined;
            }
        };
    }

    destroy() {
        this.#rootElement.removeEventListener("click", this.#clickHandlerBound);
        this.#teardownResponsiveMode();
        this.#rootElement.classList.remove("is-loading", "is-error");
        this.#loadingPromise = undefined;
        this.#catalogEntries = [];
        this.#openCardId = undefined;
        this.#cardSelectHandler = undefined;
        this.#setCollapsedState(false);
        this.#initialized = false;
    }

    #createRootElement() {
        let rootElement = createElement("aside", "side-bar");
        rootElement.dataset.sideBar = "";
        return rootElement;
    }

    #captureElements() {
        this.#listElement = findElement(this.#rootElement, "[data-card-list]");
        this.#statusElement = findElement(this.#rootElement, "[data-side-bar-status]");
        this.#panelElement = findElement(this.#rootElement, "[data-side-bar-panel]");
        this.#itemTemplateElement = findTemplate(this.#rootElement, "[data-card-item-template]");
        this.#toggleButtonElement = findButton(this.#rootElement, "[data-side-bar-toggle]");
        this.#toggleMarkerElement = findElement(this.#rootElement, "[data-side-bar-toggle-marker]");
        this.#syncCollapsedState();
    }

    #loadCatalog() {
        this.#setCollapsedState(this.#isOverlayMode);
        this.#rootElement.classList.remove("is-error");
        this.#rootElement.classList.add("is-loading");
        this.#setStatus("Загрузка карточек...");

        this.#loadingPromise = fetch(DEFAULT_CATALOG_URL)
            .then((response) => this.#readCatalogResponse(response))
            .then((catalogEntries) => this.#hydrateCatalogEntries(catalogEntries))
            .then((catalogEntries) => this.#applyCatalogEntries(catalogEntries))
            .catch(() => this.#showCatalogError())
            .finally(() => this.#finishCatalogLoading());

        return this.#loadingPromise;
    }

    #readCatalogResponse(response) {
        if (!response.ok) {
            throw new Error(`Catalog request failed: ${response.status}`);
        }

        return response.json().then((catalogDefinition) => normalizeCatalog(catalogDefinition));
    }

    async #hydrateCatalogEntries(catalogEntries) {
        return Promise.all(catalogEntries.map((entry) => this.#hydrateCatalogEntry(entry)));
    }

    async #hydrateCatalogEntry(entry) {
        if (entry.title && entry.description) {
            return entry;
        }

        try {
            let response = await fetch(entry.url);
            let cardDefinition = response.ok ? await response.json() : {};
            return this.#mergeEntryWithCard(entry, cardDefinition);
        } catch {
            return entry;
        }
    }

    #mergeEntryWithCard(entry, cardDefinition) {
        return {
            ...entry,
            description: entry.description || normalizeText(cardDefinition.statement),
            id: entry.id || normalizeText(cardDefinition.id, buildFallbackCardId(entry.url)),
            title: entry.title || normalizeText(cardDefinition.title, entry.url),
        };
    }

    #applyCatalogEntries(catalogEntries) {
        this.#catalogEntries = catalogEntries;
        this.#renderEntries();

        if (this.#catalogEntries.length === 0) {
            this.#setStatus("Список карточек пока пуст.");
            return;
        }

        this.#setStatus("");
        this.#setOpenCard(this.#catalogEntries[0].id, true);
    }

    #showCatalogError() {
        this.#catalogEntries = [];
        this.#renderEntries();
        this.#rootElement.classList.add("is-error");
        this.#setStatus("Не удалось загрузить список карточек.");
    }

    #finishCatalogLoading() {
        this.#rootElement.classList.remove("is-loading");
        this.#loadingPromise = undefined;
    }

    #setupResponsiveMode() {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            this.#applyResponsiveMode(false, true);
            return;
        }

        let mediaQueryList = window.matchMedia(OVERLAY_LAYOUT_MEDIA_QUERY);
        this.#overlayModeMediaQueryList = mediaQueryList;
        this.#addMediaQueryListener(mediaQueryList);
        this.#applyResponsiveMode(mediaQueryList.matches, true);
    }

    #addMediaQueryListener(mediaQueryList) {
        if (typeof mediaQueryList.addEventListener === "function") {
            mediaQueryList.addEventListener("change", this.#viewportChangeHandlerBound);
        } else if (typeof mediaQueryList.addListener === "function") {
            mediaQueryList.addListener(this.#viewportChangeHandlerBound);
        }
    }

    #teardownResponsiveMode() {
        let mediaQueryList = this.#overlayModeMediaQueryList;
        if (!mediaQueryList) {
            return;
        }

        if (typeof mediaQueryList.removeEventListener === "function") {
            mediaQueryList.removeEventListener("change", this.#viewportChangeHandlerBound);
        } else if (typeof mediaQueryList.removeListener === "function") {
            mediaQueryList.removeListener(this.#viewportChangeHandlerBound);
        }

        this.#overlayModeMediaQueryList = undefined;
        this.#isOverlayMode = false;
    }

    #handleViewportChange() {
        this.#applyResponsiveMode(this.#overlayModeMediaQueryList?.matches === true);
    }

    #applyResponsiveMode(isOverlayMode, forceUpdate = false) {
        let nextOverlayMode = isOverlayMode === true;
        if (!forceUpdate && this.#isOverlayMode === nextOverlayMode) {
            return;
        }

        this.#isOverlayMode = nextOverlayMode;
        this.#setCollapsedState(this.#isOverlayMode);
    }

    #handleClick(event) {
        let clickTarget = event.target instanceof Element ? event.target : undefined;
        if (!clickTarget) {
            return;
        }

        if (this.#handleSideBarToggleClick(clickTarget)) {
            return;
        }

        if (this.#handleOverlayFreeSpaceClick(clickTarget)) {
            return;
        }

        this.#handleCardButtonClick(clickTarget);
    }

    #handleSideBarToggleClick(clickTarget) {
        let toggleButton = clickTarget.closest("[data-side-bar-toggle]");
        if (!(toggleButton instanceof HTMLButtonElement) || !this.#rootElement.contains(toggleButton)) {
            return false;
        }

        this.#setCollapsedState(!this.#isCollapsed);
        return true;
    }

    #handleOverlayFreeSpaceClick(clickTarget) {
        if (!this.#isOverlayMode || !this.#rootElement.contains(clickTarget)) {
            return false;
        }

        if (this.#isCollapsed || clickTarget.closest(".side-bar-head")) {
            this.#setCollapsedState(!this.#isCollapsed);
            return true;
        }

        if (!clickTarget.closest(".card-item")) {
            this.#setCollapsedState(true);
            return true;
        }

        return false;
    }

    #handleCardButtonClick(clickTarget) {
        let cardButton = clickTarget.closest("[data-card-id]");
        if (!(cardButton instanceof HTMLButtonElement) || !this.#rootElement.contains(cardButton)) {
            return;
        }

        let cardId = normalizeText(cardButton.dataset.cardId);
        this.#setOpenCard(this.#openCardId === cardId ? undefined : cardId, true);
    }

    #setOpenCard(cardId, shouldNotify) {
        this.#openCardId = cardId;
        this.#renderEntries();

        if (!shouldNotify || !cardId) {
            return;
        }

        let selectedEntry = this.#catalogEntries.find((entry) => entry.id === cardId);
        if (selectedEntry) {
            this.#cardSelectHandler?.(selectedEntry);
        }
    }

    #renderEntries() {
        if (!this.#listElement) {
            return;
        }

        let cardElements = this.#catalogEntries.map((entry) => this.#createCardElement(entry));
        this.#listElement.replaceChildren(...cardElements);
        this.#syncCollapsedState();
    }

    #createCardElement(entry) {
        let isOpen = this.#openCardId === entry.id;
        let templateContent = this.#itemTemplateElement?.content.cloneNode(true);
        let cardElement = templateContent instanceof DocumentFragment
            ? templateContent.firstElementChild
            : undefined;

        if (!(cardElement instanceof HTMLElement)) {
            cardElement = createElement("article", "card-item");
        }

        this.#fillCardElement(cardElement, entry, isOpen);
        return cardElement;
    }

    #fillCardElement(cardElement, entry, isOpen) {
        cardElement.classList.toggle("is-open", isOpen);
        let cardButton = findButton(cardElement, ".card-button");
        cardButton?.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (cardButton) {
            cardButton.dataset.cardId = entry.id;
        }

        this.#setElementText(cardElement, ".card-title", entry.title);
        this.#setElementText(cardElement, ".card-marker", isOpen ? "−" : "+");
        this.#setElementText(cardElement, ".card-description", entry.description);
        findElement(cardElement, ".card-content")?.toggleAttribute("hidden", !isOpen);
    }

    #setElementText(rootElement, selector, text) {
        let element = findElement(rootElement, selector);
        if (element) {
            element.textContent = text;
        }
    }

    #setStatus(statusText = "") {
        if (!this.#statusElement) {
            return;
        }

        this.#statusElement.textContent = normalizeText(statusText);
        this.#statusElement.hidden = this.#statusElement.textContent.length === 0;
    }

    #setCollapsedState(isCollapsed) {
        this.#isCollapsed = isCollapsed === true;
        this.#syncCollapsedState();
    }

    #syncCollapsedState() {
        this.#rootElement.classList.toggle("is-collapsed", this.#isCollapsed);
        this.#rootElement.classList.toggle("is-overlay-mode", this.#isOverlayMode);
        this.#syncPanelState();
        this.#syncToggleState();
    }

    #syncPanelState() {
        if (this.#listElement) {
            this.#listElement.hidden = this.#catalogEntries.length === 0;
        }

        this.#statusElement?.toggleAttribute("hidden", this.#statusElement.textContent.length === 0);
        this.#panelElement?.setAttribute("aria-hidden", this.#isCollapsed ? "true" : "false");
        if (this.#panelElement && "inert" in this.#panelElement) {
            this.#panelElement.inert = this.#isCollapsed;
        }
    }

    #syncToggleState() {
        if (!this.#toggleButtonElement) {
            return;
        }

        let toggleLabel = this.#isCollapsed ? "Открыть карточки" : "Закрыть карточки";
        this.#toggleButtonElement.hidden = !this.#isOverlayMode;
        this.#toggleButtonElement.setAttribute("aria-expanded", this.#isCollapsed ? "false" : "true");
        this.#toggleButtonElement.setAttribute("aria-label", toggleLabel);
        this.#toggleButtonElement.title = toggleLabel;

        if (this.#toggleMarkerElement) {
            this.#toggleMarkerElement.textContent = this.#isCollapsed ? "+" : "−";
        }
    }
}

export {SideBarComponent};
