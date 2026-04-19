const DEFAULT_CATALOG_URL = "./cards/index.json";
const CATALOG_VERSION = "20260419d";
const OVERLAY_LAYOUT_MEDIA_QUERY = "(max-width: 1024px), (hover: none) and (pointer: coarse)";

/**
 * @param {string} resourceUrl
 * @returns {string}
 */
function buildVersionedUrl(resourceUrl) {
    let normalizedUrl = normalizeText(resourceUrl);
    if (!normalizedUrl) {
        return normalizedUrl;
    }

    return `${normalizedUrl}${normalizedUrl.includes("?") ? "&" : "?"}v=${CATALOG_VERSION}`;
}

/**
 * @typedef {{
 *     id: string,
 *     title: string,
 *     subtitle: string,
 *     description: string,
 *     url: string,
 * }} CardCatalogEntry
 */

/**
 * @typedef {{
 *     id: string,
 *     title: string,
 *     description: string,
 *     items: CardCatalogEntry[],
 * }} CardCatalogTopic
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
        subtitle: normalizeText(entryDefinition.subtitle),
        description: normalizeText(entryDefinition.description),
        url: entryUrl,
    };
}

/**
 * @param {unknown} topicDefinition
 * @returns {CardCatalogTopic | undefined}
 */
function normalizeCardCatalogTopic(topicDefinition) {
    if (!topicDefinition || typeof topicDefinition !== "object") {
        return undefined;
    }

    let topicId = normalizeText(topicDefinition.id);
    let topicTitle = normalizeText(topicDefinition.title);
    if (!topicId || !topicTitle) {
        return undefined;
    }

    let rawItems = Array.isArray(topicDefinition.items) ? topicDefinition.items : [];
    let topicItems = [];
    for (let itemIndex = 0; itemIndex < rawItems.length; itemIndex += 1) {
        let normalizedEntry = normalizeCardCatalogEntry(rawItems[itemIndex]);
        if (normalizedEntry) {
            topicItems.push(normalizedEntry);
        }
    }

    return {
        id: topicId,
        title: topicTitle,
        description: normalizeText(topicDefinition.description),
        items: topicItems,
    };
}

/**
 * @param {unknown} catalogDefinition
 * @returns {CardCatalogTopic[]}
 */
function normalizeCardCatalog(catalogDefinition) {
    let rawTopics = Array.isArray(catalogDefinition?.topics) ? catalogDefinition.topics : [];

    let normalizedTopics = [];
    for (let topicIndex = 0; topicIndex < rawTopics.length; topicIndex += 1) {
        let normalizedTopic = normalizeCardCatalogTopic(rawTopics[topicIndex]);
        if (normalizedTopic) {
            normalizedTopics.push(normalizedTopic);
        }
    }

    if (normalizedTopics.length > 0) {
        return normalizedTopics;
    }

    // Backward-compatible fallback for legacy flat catalog.
    let rawItems = Array.isArray(catalogDefinition?.items) ? catalogDefinition.items : [];
    let fallbackItems = [];
    for (let itemIndex = 0; itemIndex < rawItems.length; itemIndex += 1) {
        let normalizedEntry = normalizeCardCatalogEntry(rawItems[itemIndex]);
        if (normalizedEntry) {
            fallbackItems.push(normalizedEntry);
        }
    }

    if (fallbackItems.length === 0) {
        return [];
    }

    return [
        {
            id: "topic-legacy",
            title: "Темы",
            description: "",
            items: fallbackItems,
        },
    ];
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

    /** @type {CardCatalogTopic[]} */
    #catalogTopics = [];

    /** @type {string | undefined} */
    #openTopicId;

    /** @type {string | undefined} */
    #selectedCardId;

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

        if (this.#loadingPromise || this.#catalogTopics.length > 0) {
            return this.#loadingPromise;
        }

        this.#setCollapsedState(this.#isOverlayMode);
        this.#rootElement.classList.remove("is-error");
        this.#setStatus("Загрузка тем...");
        this.#rootElement.classList.add("is-loading");

        this.#loadingPromise = fetch(buildVersionedUrl(DEFAULT_CATALOG_URL), {cache: "no-store"})
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Catalog request failed: ${response.status}`);
                }

                return response.json();
            })
            .then((catalogDefinition) => {
                this.#catalogTopics = normalizeCardCatalog(catalogDefinition);

                let firstTopicWithCards = this.#catalogTopics.find((topic) => topic.items.length > 0);
                this.#openTopicId =
                    firstTopicWithCards?.id
                    || this.#catalogTopics[0]?.id;
                this.#selectedCardId = firstTopicWithCards?.items[0]?.id;

                this.#renderEntries();

                if (this.#catalogTopics.length === 0) {
                    this.#setStatus("Список тем пока пуст.");
                    return;
                }

                this.#setStatus("");

                if (!this.#selectedCardId) {
                    return;
                }

                let selectedCardContext = this.#findCardContext(this.#selectedCardId);
                if (!selectedCardContext) {
                    return;
                }

                this.#cardToggleHandler?.(selectedCardContext.entry, true);
            })
            .catch(() => {
                this.#catalogTopics = [];
                this.#openTopicId = undefined;
                this.#selectedCardId = undefined;
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
        this.#catalogTopics = [];
        this.#openTopicId = undefined;
        this.#selectedCardId = undefined;
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

        let topicButton = clickTarget.closest("[data-topic-id]");
        if (topicButton instanceof HTMLButtonElement && this.#rootElement.contains(topicButton)) {
            let topicId = normalizeText(topicButton.dataset.topicId);
            if (!topicId) {
                return;
            }

            if (this.#openTopicId === topicId) {
                this.#setOpenTopic(undefined, false);
                return;
            }

            this.#setOpenTopic(topicId, true);
            return;
        }

        let cardButton = clickTarget.closest("[data-card-id]");
        if (cardButton instanceof HTMLButtonElement && this.#rootElement.contains(cardButton)) {
            let cardId = normalizeText(cardButton.dataset.cardId);
            if (!cardId) {
                return;
            }

            this.#setSelectedCard(cardId, true);
            return;
        }

        if (this.#shouldCollapseFromFreeSpaceClick(clickTarget)) {
            this.#setCollapsedState(true);
        }
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
     * @param {string | undefined} topicId
     * @param {boolean} shouldNotify
     * @returns {void}
     */
    #setOpenTopic(topicId, shouldNotify) {
        this.#openTopicId = topicId;

        let openTopic = this.#catalogTopics.find((topic) => topic.id === topicId);
        let selectedCardContext =
            this.#selectedCardId
                ? this.#findCardContext(this.#selectedCardId)
                : undefined;

        if (
            openTopic
            && (!selectedCardContext || selectedCardContext.topic.id !== openTopic.id)
            && openTopic.items.length > 0
        ) {
            this.#selectedCardId = openTopic.items[0].id;
            selectedCardContext = this.#findCardContext(this.#selectedCardId);
        }

        this.#renderEntries();

        if (!shouldNotify || !selectedCardContext) {
            return;
        }

        this.#cardToggleHandler?.(selectedCardContext.entry, true);
    }

    /**
     * @param {string} cardId
     * @param {boolean} shouldNotify
     * @returns {void}
     */
    #setSelectedCard(cardId, shouldNotify) {
        let nextSelectionContext = this.#findCardContext(cardId);
        if (!nextSelectionContext) {
            return;
        }

        let previousSelectionContext =
            this.#selectedCardId
                ? this.#findCardContext(this.#selectedCardId)
                : undefined;

        this.#selectedCardId = nextSelectionContext.entry.id;
        this.#openTopicId = nextSelectionContext.topic.id;
        this.#renderEntries();

        if (!shouldNotify) {
            return;
        }

        if (
            previousSelectionContext
            && previousSelectionContext.entry.id !== nextSelectionContext.entry.id
        ) {
            this.#cardToggleHandler?.(previousSelectionContext.entry, false);
        }

        this.#cardToggleHandler?.(nextSelectionContext.entry, true);
    }

    /** @returns {void} */
    #renderEntries() {
        if (!this.#listElement) {
            return;
        }

        if (this.#catalogTopics.length === 0) {
            this.#listElement.replaceChildren();
            this.#syncCollapsedState();
            return;
        }

        let topicElements = [];
        for (let topicIndex = 0; topicIndex < this.#catalogTopics.length; topicIndex += 1) {
            topicElements.push(this.#createTopicElement(this.#catalogTopics[topicIndex]));
        }

        this.#listElement.replaceChildren(...topicElements);
        this.#syncCollapsedState();
    }

    /**
     * @param {CardCatalogTopic} topic
     * @returns {HTMLElement}
     */
    #createTopicElement(topic) {
        let isOpen = this.#openTopicId === topic.id;
        let templateContent = this.#itemTemplateElement?.content.cloneNode(true);
        let topicElement =
            templateContent instanceof DocumentFragment
                ? templateContent.firstElementChild
                : undefined;
        if (!(topicElement instanceof HTMLElement)) {
            return document.createElement("article");
        }

        topicElement.classList.toggle("is-open", isOpen);

        let topicButton = topicElement.querySelector(".topic-button");
        if (topicButton instanceof HTMLButtonElement) {
            topicButton.dataset.topicId = topic.id;
            topicButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
        }

        let titleElement = topicElement.querySelector(".topic-title");
        if (titleElement instanceof HTMLElement) {
            titleElement.textContent = `${topic.title} (${topic.items.length})`;
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
            descriptionElement.textContent = topic.description;
            descriptionElement.hidden = topic.description.length === 0;
        }

        if (contentElement instanceof HTMLElement) {
            let cardListElement = document.createElement("ul");
            cardListElement.className = "topic-card-list";

            for (let cardIndex = 0; cardIndex < topic.items.length; cardIndex += 1) {
                let cardEntry = topic.items[cardIndex];
                let cardListItemElement = document.createElement("li");
                cardListItemElement.className = "topic-card-item";

                let cardButtonElement = document.createElement("button");
                cardButtonElement.type = "button";
                cardButtonElement.className = "topic-card-button";
                cardButtonElement.dataset.cardId = cardEntry.id;

                let isSelected = this.#selectedCardId === cardEntry.id;
                if (isSelected) {
                    cardButtonElement.classList.add("is-selected");
                    cardButtonElement.setAttribute("aria-current", "true");
                }

                let subtitleElement = document.createElement("span");
                subtitleElement.className = "topic-card-subtitle";
                subtitleElement.textContent = cardEntry.subtitle;
                subtitleElement.hidden = cardEntry.subtitle.length === 0;

                let titleElement = document.createElement("span");
                titleElement.className = "topic-card-title";
                titleElement.textContent = cardEntry.title;

                let descriptionElement = document.createElement("span");
                descriptionElement.className = "topic-card-description";
                descriptionElement.textContent = cardEntry.description;
                descriptionElement.hidden = cardEntry.description.length === 0;

                cardButtonElement.append(subtitleElement, titleElement, descriptionElement);
                cardListItemElement.append(cardButtonElement);
                cardListElement.append(cardListItemElement);
            }

            contentElement.append(cardListElement);
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
                this.#isCollapsed || this.#catalogTopics.length === 0;
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

    /**
     * @param {string} cardId
     * @returns {{topic: CardCatalogTopic, entry: CardCatalogEntry} | undefined}
     */
    #findCardContext(cardId) {
        for (let topicIndex = 0; topicIndex < this.#catalogTopics.length; topicIndex += 1) {
            let topic = this.#catalogTopics[topicIndex];
            let entry = topic.items.find((topicEntry) => topicEntry.id === cardId);
            if (entry) {
                return {topic, entry};
            }
        }

        return undefined;
    }
}

export {SideBar};
