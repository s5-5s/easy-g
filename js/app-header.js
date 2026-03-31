class AppHeader {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {HTMLButtonElement} */
    #bookButton;

    /** @type {HTMLButtonElement} */
    #themeButton;

    /** @type {(() => void) | undefined} */
    #bookToggleHandler;

    /** @type {(() => void) | undefined} */
    #themeToggleHandler;

    /** @type {boolean} */
    #initialized = false;

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : document.createElement("header");
        this.#rootElement.classList.add("app-header");
        this.#compose();
    }

    /** @returns {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /** @returns {void} */
    initialize() {
        if (this.#initialized) {
            return;
        }

        this.#bookButton.addEventListener("click", () => {
            this.#bookToggleHandler?.();
        });

        this.#themeButton.addEventListener("click", () => {
            this.#themeToggleHandler?.();
        });

        this.#initialized = true;
    }

    /**
     * @param {(() => void) | undefined} handler
     * @returns {void}
     */
    onBookToggle(handler) {
        this.#bookToggleHandler = handler;
    }

    /**
     * @param {(() => void) | undefined} handler
     * @returns {void}
     */
    onThemeToggle(handler) {
        this.#themeToggleHandler = handler;
    }

    /**
     * @param {boolean} isOpen
     * @returns {void}
     */
    setBookOpen(isOpen) {
        this.#bookButton.classList.toggle("is-active", Boolean(isOpen));
        this.#bookButton.setAttribute("aria-pressed", String(Boolean(isOpen)));
    }

    /**
     * @param {string} themeValue
     * @returns {void}
     */
    setTheme(themeValue) {
        let isDark = themeValue === "dark";
        this.#themeButton.textContent = isDark ? "◑" : "◐";
        this.#themeButton.setAttribute(
            "aria-label",
            isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"
        );
    }

    /** @returns {void} */
    #compose() {
        this.#bookButton = document.createElement("button");
        this.#bookButton.type = "button";
        this.#bookButton.className = "control-button control-book";
        this.#bookButton.textContent = "☰";
        this.#bookButton.setAttribute("aria-label", "Открыть список тем");
        this.#bookButton.setAttribute("aria-pressed", "false");

        this.#themeButton = document.createElement("button");
        this.#themeButton.type = "button";
        this.#themeButton.className = "control-button control-theme";
        this.#themeButton.textContent = "◑";
        this.#themeButton.setAttribute("aria-label", "Переключить тему");

        this.#rootElement.replaceChildren(this.#bookButton, this.#themeButton);
    }
}

export {AppHeader};
