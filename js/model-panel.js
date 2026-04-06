class ModelPanel {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {HTMLElement | undefined} */
    #modesHostElement;

    /** @type {HTMLElement | undefined} */
    #sideBarHostElement;

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

            let modesHostElement = this.#rootElement.querySelector(".modes-host");
            if (modesHostElement instanceof HTMLElement) {
                this.#modesHostElement = modesHostElement;
            }

            let sideBarHostElement = this.#rootElement.querySelector(".side-bar-host");
            if (sideBarHostElement instanceof HTMLElement) {
                this.#sideBarHostElement = sideBarHostElement;
            }

            return;
        }

        let builtElements = this.#createElement();
        this.#rootElement = builtElements.rootElement;
        this.#modesHostElement = builtElements.modesHostElement;
        this.#sideBarHostElement = builtElements.sideBarHostElement;
    }

    /** @returns {void} */
    initialize() {}

    /**
     * @param {HTMLElement | undefined} modelElement
     * @returns {void}
     */
    attachModelElement(modelElement) {
        if (!this.#rootElement || !(modelElement instanceof HTMLElement)) {
            return;
        }

        let previousModelElement = this.#rootElement.querySelector(".model-view");
        if (previousModelElement) {
            if (previousModelElement === modelElement) {
                return;
            }
            previousModelElement.replaceWith(modelElement);
            return;
        }

        this.#rootElement.prepend(modelElement);
    }

    /**
     * @param {HTMLElement | undefined} modesPanelElement
     * @returns {void}
     */
    attachModesPanelElement(modesPanelElement) {
        if (!this.#modesHostElement || !(modesPanelElement instanceof HTMLElement)) {
            return;
        }

        if (this.#modesHostElement.childElementCount === 1 && this.#modesHostElement.firstElementChild === modesPanelElement) {
            return;
        }

        this.#modesHostElement.replaceChildren(modesPanelElement);
    }

    /**
     * @param {HTMLElement | undefined} sideBarElement
     * @returns {void}
     */
    attachSideBarElement(sideBarElement) {
        if (!this.#sideBarHostElement || !(sideBarElement instanceof HTMLElement)) {
            return;
        }

        if (this.#sideBarHostElement.childElementCount === 1 && this.#sideBarHostElement.firstElementChild === sideBarElement) {
            return;
        }

        this.#sideBarHostElement.replaceChildren(sideBarElement);
    }

    /**
     * @returns {{
     *     rootElement: HTMLElement,
     *     modesHostElement: HTMLElement,
     *     sideBarHostElement: HTMLElement,
     * }}
     */
    #createElement() {
        let rootElement = document.createElement("section");
        rootElement.className = "model-panel";

        let hudLayerElement = document.createElement("div");
        hudLayerElement.className = "hud-layer";

        let hudTopElement = document.createElement("div");
        hudTopElement.className = "hud-top";

        let modesHostElement = document.createElement("div");
        modesHostElement.className = "modes-host";

        let sideBarHostElement = document.createElement("div");
        sideBarHostElement.className = "side-bar-host";

        hudTopElement.append(modesHostElement);
        hudLayerElement.append(hudTopElement, sideBarHostElement);
        rootElement.append(hudLayerElement);

        return {
            rootElement,
            modesHostElement,
            sideBarHostElement,
        };
    }
}

export {ModelPanel};
