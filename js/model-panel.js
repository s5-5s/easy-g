class ModelPanel {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {HTMLElement | undefined} */
    #sideBarHostElement;

    /** @type {HTMLElement | undefined} */
    #modelHostElement;

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        if (rootElement instanceof HTMLElement) {
            this.#rootElement = rootElement;
            this.#rootElement.className = "model-panel";
            this.#rootElement.dataset.modelPanel = "";

            let sideBarHostElement = this.#rootElement.querySelector(".side-bar-host");
            this.#sideBarHostElement =
                sideBarHostElement instanceof HTMLElement
                    ? sideBarHostElement
                    : document.createElement("div");
            this.#sideBarHostElement.className = "side-bar-host";

            let modelHostElement = this.#rootElement.querySelector(".model-host");
            this.#modelHostElement =
                modelHostElement instanceof HTMLElement
                    ? modelHostElement
                    : document.createElement("div");
            this.#modelHostElement.className = "model-host";

            this.#rootElement.replaceChildren(this.#sideBarHostElement, this.#modelHostElement);
            return;
        }

        let builtElements = this.#createElement();
        this.#rootElement = builtElements.rootElement;
        this.#sideBarHostElement = builtElements.sideBarHostElement;
        this.#modelHostElement = builtElements.modelHostElement;
    }

    /** @returns {void} */
    initialize() {}

    /**
     * @param {HTMLElement | undefined} modelElement
     * @returns {void}
     */
    attachModelElement(modelElement) {
        if (!this.#modelHostElement || !(modelElement instanceof HTMLElement)) {
            return;
        }

        if (
            this.#modelHostElement.childElementCount === 1
            && this.#modelHostElement.firstElementChild === modelElement
        ) {
            return;
        }

        this.#modelHostElement.replaceChildren(modelElement);
    }

    /**
     * @param {HTMLElement | undefined} sideBarElement
     * @returns {void}
     */
    attachSideBarElement(sideBarElement) {
        if (!this.#sideBarHostElement || !(sideBarElement instanceof HTMLElement)) {
            return;
        }

        if (
            this.#sideBarHostElement.childElementCount === 1
            && this.#sideBarHostElement.firstElementChild === sideBarElement
        ) {
            return;
        }

        this.#sideBarHostElement.replaceChildren(sideBarElement);
    }

    /**
     * @returns {{
     *     rootElement: HTMLElement,
     *     sideBarHostElement: HTMLElement,
     *     modelHostElement: HTMLElement,
     * }}
     */
    #createElement() {
        let rootElement = document.createElement("section");
        rootElement.className = "model-panel";
        rootElement.dataset.modelPanel = "";

        let sideBarHostElement = document.createElement("div");
        sideBarHostElement.className = "side-bar-host";

        let modelHostElement = document.createElement("div");
        modelHostElement.className = "model-host";

        rootElement.append(sideBarHostElement, modelHostElement);

        return {
            rootElement,
            sideBarHostElement,
            modelHostElement,
        };
    }
}

export {ModelPanel};
