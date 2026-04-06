const DEFAULT_MAX_ITEMS = 5;
const MIC_WAVE_BAR_COUNT = 5;

class SideBar {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {HTMLElement | undefined} */
    #commandsListElement;

    /** @type {HTMLButtonElement | undefined} */
    #micButtonElement;

    /** @type {number} */
    #maxItems;

    /** @type {(event: MouseEvent) => void} */
    #micClickHandlerBound;

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /** @type {boolean} */
    get micEnabled() {
        return this.#rootElement?.classList.contains("is-mic-enabled") === true;
    }

    /**
     * @param {number} maxItems
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(maxItems = DEFAULT_MAX_ITEMS, rootElement) {
        this.#maxItems = maxItems;
        this.#micClickHandlerBound = this.#handleMicClick.bind(this);
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : this.#createElement();
    }

    /** @returns {void} */
    initialize() {
        if (!this.#rootElement) {
            return;
        }

        let commandsElement = this.#rootElement.querySelector("[data-commands]");
        if (commandsElement instanceof HTMLElement) {
            this.#commandsListElement = commandsElement;
        }

        let micButtonElement = this.#rootElement.querySelector("[data-mic-toggle]");
        if (micButtonElement instanceof HTMLButtonElement) {
            this.#micButtonElement = micButtonElement;
            this.#micButtonElement.addEventListener("click", this.#micClickHandlerBound);
        }

        this.setMicEnabled(false);
        this.setRecognizing(false);
        this.setConnected(false);
    }

    /**
     * @param {string} text
     * @returns {void}
     */
    pushCommand(text) {
        if (!this.#commandsListElement || typeof text !== "string") {
            return;
        }

        let commandText = text.trim();
        if (!commandText) {
            return;
        }

        let commandElement = document.createElement("div");
        commandElement.className = "command-item";
        commandElement.textContent = commandText;
        this.#commandsListElement.append(commandElement);

        while (this.#commandsListElement.childElementCount > this.#maxItems) {
            this.#commandsListElement.firstElementChild?.remove();
        }

        this.#commandsListElement.scrollTop = this.#commandsListElement.scrollHeight;
    }

    /**
     * @param {boolean} isEnabled
     * @returns {void}
     */
    setMicEnabled(isEnabled) {
        let micEnabled = isEnabled === true;
        this.#rootElement?.classList.toggle("is-mic-enabled", micEnabled);
        this.#micButtonElement?.setAttribute("aria-pressed", micEnabled ? "true" : "false");

        if (!micEnabled) {
            this.setRecognizing(false);
        }
    }

    /**
     * @param {boolean} isRecognizing
     * @returns {void}
     */
    setRecognizing(isRecognizing) {
        this.#rootElement?.classList.toggle("is-recognizing", isRecognizing === true);
    }

    /**
     * @param {boolean} isConnected
     * @returns {void}
     */
    setConnected(isConnected) {
        this.#rootElement?.classList.toggle("is-disconnected", isConnected !== true);
    }

    /** @returns {void} */
    destroy() {
        this.#micButtonElement?.removeEventListener("click", this.#micClickHandlerBound);
        this.#rootElement?.classList.remove("is-mic-enabled", "is-recognizing", "is-disconnected");
        this.#commandsListElement = undefined;
        this.#micButtonElement = undefined;
    }

    /** @returns {void} */
    #handleMicClick() {
        this.setMicEnabled(!this.micEnabled);
    }

    /** @returns {HTMLElement} */
    #createElement() {
        let rootElement = document.createElement("aside");
        rootElement.className = "side-bar";
        rootElement.dataset.sideBar = "";

        let headElement = document.createElement("div");
        headElement.className = "side-bar-head";

        let micButtonElement = document.createElement("button");
        micButtonElement.className = "mic-button";
        micButtonElement.type = "button";
        micButtonElement.dataset.micToggle = "";
        micButtonElement.setAttribute("aria-pressed", "false");
        micButtonElement.setAttribute("aria-label", "Включить микрофон");

        let micStemElement = document.createElement("span");
        micStemElement.className = "mic-stem";
        micButtonElement.append(micStemElement);

        let waveElement = document.createElement("div");
        waveElement.className = "wave";
        waveElement.setAttribute("aria-hidden", "true");

        for (let barIndex = 0; barIndex < MIC_WAVE_BAR_COUNT; barIndex += 1) {
            waveElement.append(document.createElement("i"));
        }

        let commandsElement = document.createElement("div");
        commandsElement.className = "commands";
        commandsElement.dataset.commands = "";

        headElement.append(micButtonElement, waveElement);
        rootElement.append(headElement, commandsElement);

        return rootElement;
    }
}

export {SideBar};
