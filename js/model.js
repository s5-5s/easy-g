import {CardEngine} from "./card-engine.js";

const DEFAULT_CARD_URL = "./cards/perpendicular-planes.json";

class Model {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {CardEngine | undefined} */
    #cardEngine;

    /** @type {Promise<void> | undefined} */
    #loadingPromise;

    /** @type {string | undefined} */
    #currentCardUrl;

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#rootElement =
            rootElement instanceof HTMLElement
                ? rootElement
                : document.createElement("div");
        this.#rootElement.classList.add("model-view");
        this.#rootElement.dataset.model = "";
    }

    /** @returns {Promise<void> | undefined} */
    initialize() {
        if (!this.#rootElement) {
            return undefined;
        }

        if (!this.#cardEngine) {
            this.#rootElement.classList.remove("is-error");
            this.#cardEngine = new CardEngine(this.#rootElement);
        }

        if (!this.#currentCardUrl) {
            return this.loadCard(DEFAULT_CARD_URL);
        }

        return this.#loadingPromise;
    }

    /**
     * @param {string} cardUrl
     * @returns {Promise<void> | undefined}
     */
    loadCard(cardUrl) {
        if (!this.#rootElement || typeof cardUrl !== "string" || cardUrl.trim().length === 0) {
            return this.#loadingPromise;
        }

        if (!this.#cardEngine) {
            this.#cardEngine = new CardEngine(this.#rootElement);
        }

        let normalizedCardUrl = cardUrl.trim();
        if (this.#loadingPromise && this.#currentCardUrl === normalizedCardUrl) {
            return this.#loadingPromise;
        }

        this.#currentCardUrl = normalizedCardUrl;
        this.#rootElement.classList.remove("is-error");
        this.#rootElement.classList.add("is-loading");
        this.#cardEngine.setStatus("Загрузка карточки...");

        this.#loadingPromise = this.#cardEngine
            .loadCard(normalizedCardUrl)
            .catch(() => {
                this.#rootElement?.classList.add("is-error");
                this.#cardEngine?.setStatus("Не удалось загрузить карточку.");
            })
            .finally(() => {
                if (!this.#rootElement?.classList.contains("is-error")) {
                    this.#cardEngine?.setStatus("");
                }
                this.#rootElement?.classList.remove("is-loading");
                this.#loadingPromise = undefined;
            });

        return this.#loadingPromise;
    }

    /** @returns {void} */
    destroy() {
        this.#cardEngine?.destroy();
        this.#cardEngine = undefined;
        this.#loadingPromise = undefined;
        this.#currentCardUrl = undefined;

        if (!this.#rootElement) {
            return;
        }

        this.#rootElement.classList.remove("is-loading", "is-error");
        this.#rootElement.replaceChildren();
    }
}

export {Model};
