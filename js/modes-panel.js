const MODES = ["fix", "following", "off"];

const MODE_BUTTONS = Object.freeze([
    {value: "fix", label: "Фиксация"},
    {value: "following", label: "Следование"},
    {value: "off", label: "Выкл"},
]);

class ModesPanel {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {Map<string, HTMLButtonElement>} */
    #buttonsByMode = new Map();

    /** @type {Array<(mode: string) => void>} */
    #modeChangeHandlers = [];

    /** @type {string} */
    #mode = "off";

    /** @type {(event: MouseEvent) => void} */
    #clickHandlerBound;

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /** @type {string} */
    get mode() {
        return this.#mode;
    }

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#clickHandlerBound = this.#handleClick.bind(this);
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : this.#createElement();
    }

    /** @returns {void} */
    initialize() {
        if (!this.#rootElement || this.#buttonsByMode.size > 0) {
            return;
        }

        let modeButtons = this.#rootElement.querySelectorAll("[data-mode]");
        modeButtons.forEach((modeButton) => {
            if (!(modeButton instanceof HTMLButtonElement)) {
                return;
            }

            let modeValue = modeButton.dataset.mode;
            if (!modeValue || !MODES.includes(modeValue)) {
                return;
            }

            this.#buttonsByMode.set(modeValue, modeButton);
        });

        this.#rootElement.addEventListener("click", this.#clickHandlerBound);
        this.setMode(this.#mode);
    }

    /**
     * @param {string} mode
     * @returns {void}
     */
    setMode(mode) {
        if (!MODES.includes(mode)) {
            return;
        }

        this.#mode = mode;
        this.#syncModeState();
    }

    /**
     * @param {(mode: string) => void} handler
     * @returns {() => void}
     */
    onModeChange(handler) {
        if (typeof handler !== "function") {
            return () => {};
        }

        this.#modeChangeHandlers.push(handler);
        return () => {
            this.offModeChange(handler);
        };
    }

    /**
     * @param {(mode: string) => void} handler
     * @returns {void}
     */
    offModeChange(handler) {
        let handlerIndex = this.#modeChangeHandlers.indexOf(handler);
        if (handlerIndex >= 0) {
            this.#modeChangeHandlers.splice(handlerIndex, 1);
        }
    }

    /** @returns {void} */
    destroy() {
        if (!this.#rootElement) {
            return;
        }

        this.#rootElement.removeEventListener("click", this.#clickHandlerBound);
        this.#rootElement.style.removeProperty("--active-index");
        this.#rootElement.removeAttribute("data-active-mode");
        this.#buttonsByMode.clear();
        this.#modeChangeHandlers = [];
    }

    /**
     * @param {MouseEvent} event
     * @returns {void}
     */
    #handleClick(event) {
        let targetElement = event.target instanceof Element ? event.target : undefined;
        if (!targetElement) {
            return;
        }

        let modeButton = targetElement.closest("[data-mode]");
        if (!(modeButton instanceof HTMLButtonElement)) {
            return;
        }

        let modeValue = modeButton.dataset.mode;
        if (!modeValue || !MODES.includes(modeValue) || modeValue === this.#mode) {
            return;
        }

        this.setMode(modeValue);
        this.#modeChangeHandlers.forEach((handler) => {
            handler(modeValue);
        });
    }

    /** @returns {void} */
    #syncModeState() {
        if (!this.#rootElement) {
            return;
        }

        let activeIndex = MODES.indexOf(this.#mode);
        this.#rootElement.style.setProperty("--active-index", String(activeIndex));
        this.#rootElement.setAttribute("data-active-mode", this.#mode);

        this.#buttonsByMode.forEach((modeButton, modeValue) => {
            let isActive = modeValue === this.#mode;
            modeButton.classList.toggle("is-active", isActive);
            modeButton.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    /** @returns {HTMLElement} */
    #createElement() {
        let rootElement = document.createElement("div");
        rootElement.className = "modes-panel";
        rootElement.dataset.modesPanel = "";
        rootElement.setAttribute("role", "group");
        rootElement.setAttribute("aria-label", "Режим работы");

        MODE_BUTTONS.forEach((modeButtonConfig) => {
            let modeButton = document.createElement("button");
            modeButton.className = "mode-button";
            modeButton.type = "button";
            modeButton.dataset.mode = modeButtonConfig.value;
            modeButton.textContent = modeButtonConfig.label;
            modeButton.setAttribute("aria-pressed", "false");
            rootElement.append(modeButton);
        });

        return rootElement;
    }
}

export {ModesPanel};
