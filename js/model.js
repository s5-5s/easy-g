import ModelView from "./model-view.js";

class Model {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {ModelView | undefined} */
    #modelView;

    /** @type {Promise<void> | undefined} */
    #loadingPromise;

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : document.createElement("div");
        this.#rootElement.classList.add("model-view");
        this.#rootElement.dataset.model = "";
    }

    /** @returns {Promise<void> | undefined} */
    initialize() {
        if (!this.#rootElement || this.#loadingPromise || this.#modelView) {
            return this.#loadingPromise;
        }

        this.#rootElement.classList.remove("is-error");
        this.#rootElement.classList.add("is-loading");

        this.#modelView = new ModelView(this.#rootElement);
        this.#loadingPromise = this.#modelView
            .loadGlb("./models/is.glb")
            .catch(() => {
                this.#rootElement?.classList.add("is-error");
            })
            .finally(() => {
                this.#rootElement?.classList.remove("is-loading");
                this.#loadingPromise = undefined;
            });

        return this.#loadingPromise;
    }

    /** @returns {void} */
    destroy() {
        this.#modelView?.destroy?.();
        this.#modelView = undefined;
        this.#loadingPromise = undefined;

        if (!this.#rootElement) {
            return;
        }

        this.#rootElement.classList.remove("is-loading", "is-error");
        this.#rootElement.replaceChildren();
    }
}

export {Model};
