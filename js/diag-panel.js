const SERVICE_ITEMS = Object.freeze([
    {key: "gu", label: "ГУ"},
    {key: "radomir-service", label: "radomir-service"},
    {key: "ethercat-master", label: "ethercat-master"},
]);

class DiagPanel {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {Map<string, HTMLElement>} */
    #itemsByService = new Map();

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : this.#createElement();
    }

    /** @returns {void} */
    initialize() {
        if (!this.#rootElement || this.#itemsByService.size > 0) {
            return;
        }

        let serviceElements = this.#rootElement.querySelectorAll("[data-service]");
        serviceElements.forEach((serviceElement) => {
            if (!(serviceElement instanceof HTMLElement)) {
                return;
            }

            let serviceKey = serviceElement.dataset.service;
            if (!serviceKey) {
                return;
            }

            this.#itemsByService.set(serviceKey, serviceElement);
        });

        this.setAllDisconnected();
    }

    /**
     * @param {string} serviceKey
     * @param {boolean} isConnected
     * @returns {void}
     */
    setServiceState(serviceKey, isConnected) {
        let serviceElement = this.#itemsByService.get(serviceKey);
        if (!serviceElement) {
            return;
        }

        serviceElement.classList.toggle("is-connected", isConnected === true);
        serviceElement.classList.toggle("is-disconnected", isConnected !== true);
        this.#syncEmptyState();
    }

    /** @returns {void} */
    setAllDisconnected() {
        this.#itemsByService.forEach((serviceElement) => {
            serviceElement.classList.remove("is-connected", "is-unknown");
            serviceElement.classList.add("is-disconnected");
        });
        this.#syncEmptyState();
    }

    /** @returns {void} */
    destroy() {
        this.#itemsByService.clear();
    }

    /** @returns {void} */
    #syncEmptyState() {
        if (!this.#rootElement) {
            return;
        }

        let serviceElements = Array.from(this.#itemsByService.values());
        let hasConnectedService = serviceElements.some((serviceElement) => {
            return serviceElement.classList.contains("is-connected");
        });

        this.#rootElement.classList.toggle("is-empty", !hasConnectedService);
    }

    /** @returns {HTMLElement} */
    #createElement() {
        let rootElement = document.createElement("footer");
        rootElement.className = "diag-panel";
        rootElement.dataset.diagPanel = "";

        let emptyElement = document.createElement("div");
        emptyElement.className = "diag-empty";
        emptyElement.textContent = "НЕТ СОЕДИНЕНИЯ";

        let itemsElement = document.createElement("div");
        itemsElement.className = "diag-items";

        SERVICE_ITEMS.forEach((serviceItem) => {
            let itemElement = document.createElement("div");
            itemElement.className = "diag-item";
            itemElement.dataset.service = serviceItem.key;

            let dotElement = document.createElement("span");
            dotElement.className = "diag-dot";

            let nameElement = document.createElement("span");
            nameElement.className = "diag-name";
            nameElement.textContent = serviceItem.label;

            itemElement.append(dotElement, nameElement);
            itemsElement.append(itemElement);
        });

        rootElement.append(emptyElement, itemsElement);

        return rootElement;
    }
}

export {DiagPanel};
