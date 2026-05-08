import {normalizeText} from "../shared/normalize.js";
import {CardEngine} from "../card-engine/card-engine.js";

const DEFAULT_CARD_URL = "./cards/perpendicular-planes.json";

class CardViewerComponent {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {CardEngine | undefined} */
    #cardEngine;

    /** @type {Promise<void> | undefined} */
    #loadingPromise;

    /** @type {string | undefined} */
    #currentCardUrl;

    get element() {
        return this.#rootElement;
    }

    constructor(rootElement) {
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : document.createElement("div");
        this.#rootElement.classList.add("card-viewer");
        this.#rootElement.dataset.cardViewer = "";
    }

    initialize() {
        this.#ensureCardEngine();
        if (!this.#currentCardUrl) {
            return this.loadCard(DEFAULT_CARD_URL);
        }

        return this.#loadingPromise;
    }

    loadCard(cardUrl) {
        let normalizedCardUrl = normalizeText(cardUrl);
        if (!normalizedCardUrl) {
            return this.#loadingPromise;
        }

        this.#ensureCardEngine();
        if (this.#loadingPromise && this.#currentCardUrl === normalizedCardUrl) {
            return this.#loadingPromise;
        }

        this.#currentCardUrl = normalizedCardUrl;
        return this.#loadCurrentCard();
    }

    destroy() {
        this.#cardEngine?.destroy();
        this.#cardEngine = undefined;
        this.#loadingPromise = undefined;
        this.#currentCardUrl = undefined;
        this.#rootElement.classList.remove("is-loading", "is-error");
        this.#rootElement.replaceChildren();
    }

    #ensureCardEngine() {
        if (this.#cardEngine) {
            return;
        }

        this.#rootElement.classList.remove("is-error");
        this.#cardEngine = new CardEngine(this.#rootElement);
    }

    #loadCurrentCard() {
        this.#rootElement.classList.remove("is-error");
        this.#rootElement.classList.add("is-loading");
        this.#cardEngine?.setStatus("");

        this.#loadingPromise = this.#cardEngine
            ?.loadCard(this.#currentCardUrl)
            .catch(() => this.#showLoadError())
            .finally(() => this.#finishLoading());

        return this.#loadingPromise;
    }

    #showLoadError() {
        this.#rootElement.classList.add("is-error");
        this.#cardEngine?.setStatus("Не удалось загрузить карточку.");
    }

    #finishLoading() {
        if (!this.#rootElement.classList.contains("is-error")) {
            this.#cardEngine?.setStatus("");
        }

        this.#rootElement.classList.remove("is-loading");
        this.#loadingPromise = undefined;
    }
}

export {CardViewerComponent};
