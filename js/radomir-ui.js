import {Topic, normalizeBooleanTopicValue} from "./topics.js";
import {ModesPanel} from "./modes-panel.js";
import {SideBar} from "./side-bar.js";
import {DiagPanel} from "./diag-panel.js";
import {Model} from "./model.js";
import {ModelPanel} from "./model-panel.js";

const RECOGNITION_TIMEOUT_MS = 1000;

const VALID_MODES = ["fix", "following", "off"];
const APP_SELECTOR = "[data-app]";
const MAIN_SELECTOR = "[data-app-main]";
const MODEL_SELECTOR = "[data-model]";
const MODEL_PANEL_SELECTOR = "[data-model-panel]";
const MODES_PANEL_SELECTOR = "[data-modes-panel]";
const SIDE_BAR_SELECTOR = "[data-side-bar]";
const DIAG_PANEL_SELECTOR = "[data-diag-panel]";

class RadomirUi {
    /** @type {HTMLElement | undefined} */
    #rootElement;

    /** @type {HTMLElement | undefined} */
    #mainElement;

    /** @type {import("./topics.js").default} */
    #topics;

    /** @type {ModesPanel | undefined} */
    #modesPanel;

    /** @type {SideBar | undefined} */
    #sideBar;

    /** @type {DiagPanel | undefined} */
    #diagPanel;

    /** @type {Model | undefined} */
    #model;

    /** @type {ModelPanel | undefined} */
    #modelPanel;

    /** @type {number | undefined} */
    #recognitionResetTimer;

    /** @type {(() => void) | undefined} */
    #offModeChange;

    /** @type {(value: unknown) => void | undefined} */
    #modeTopicHandler;

    /** @type {(value: unknown) => void | undefined} */
    #voiceTopicHandler;

    /** @type {(value: unknown) => void | undefined} */
    #guTopicHandler;

    /** @type {(value: unknown) => void | undefined} */
    #radomirTopicHandler;

    /** @type {(value: unknown) => void | undefined} */
    #ethercatTopicHandler;

    /** @type {(() => void) | undefined} */
    #connectedHandler;

    /** @type {(() => void) | undefined} */
    #disconnectedHandler;

    /** @type {boolean} */
    #initialized = false;

    /** @type {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /**
     * @param {import("./topics.js").default} binderTopics
     * @param {HTMLElement | undefined} appRootElement
     */
    constructor(binderTopics, appRootElement) {
        this.#topics = binderTopics;

        let appElement =
            appRootElement instanceof HTMLElement ? appRootElement.querySelector(APP_SELECTOR) : undefined;
        if (appElement instanceof HTMLElement) {
            this.#rootElement = appElement;
        } else {
            this.#rootElement = document.createElement("div");
            this.#rootElement.className = "app";
        }

        let mainElement = this.#rootElement.querySelector(MAIN_SELECTOR);
        if (mainElement instanceof HTMLElement) {
            this.#mainElement = mainElement;
        } else {
            this.#mainElement = document.createElement("main");
            this.#mainElement.className = "main";
        }

        let modesPanelElement = this.#rootElement.querySelector(MODES_PANEL_SELECTOR);
        let sideBarElement = this.#rootElement.querySelector(SIDE_BAR_SELECTOR);
        let diagPanelElement = this.#rootElement.querySelector(DIAG_PANEL_SELECTOR);
        let modelElement = this.#rootElement.querySelector(MODEL_SELECTOR);
        let modelPanelElement = this.#rootElement.querySelector(MODEL_PANEL_SELECTOR);

        this.#modesPanel = new ModesPanel(modesPanelElement instanceof HTMLElement ? modesPanelElement : undefined);
        this.#sideBar = new SideBar(undefined, sideBarElement instanceof HTMLElement ? sideBarElement : undefined);
        this.#diagPanel = new DiagPanel(diagPanelElement instanceof HTMLElement ? diagPanelElement : undefined);
        this.#model = new Model(modelElement instanceof HTMLElement ? modelElement : undefined);
        this.#modelPanel = new ModelPanel(modelPanelElement instanceof HTMLElement ? modelPanelElement : undefined);

        this.#composeLayout();
    }

    /** @returns {void} */
    initialize() {
        if (this.#initialized || !this.#topics) {
            return;
        }

        this.#modesPanel?.initialize();
        this.#sideBar?.initialize();
        this.#diagPanel?.initialize();
        this.#model?.initialize();
        this.#modelPanel?.initialize();

        this.#offModeChange = this.#modesPanel?.onModeChange((modeValue) => {
            if (this.#topics.mode) {
                this.#topics.mode.value = modeValue;
            }
        });

        this.#modeTopicHandler = (value) => {
            this.#modesPanel?.setMode(this.#normalizeMode(value));
        };
        this.#voiceTopicHandler = (value) => {
            this.#handleVoiceCommand(value);
        };
        this.#guTopicHandler = (value) => {
            this.#diagPanel?.setServiceState("gu", normalizeBooleanTopicValue(value));
        };
        this.#radomirTopicHandler = (value) => {
            this.#diagPanel?.setServiceState("radomir-service", normalizeBooleanTopicValue(value));
        };
        this.#ethercatTopicHandler = (value) => {
            this.#diagPanel?.setServiceState("ethercat-master", normalizeBooleanTopicValue(value));
        };

        this.#connectedHandler = () => {
            this.#sideBar?.setConnected(true);
            this.#modesPanel?.setMode(this.#normalizeMode(this.#topics.mode.value));
            this.#syncDiagnostics();
        };

        this.#disconnectedHandler = () => {
            this.#sideBar?.setConnected(false);
            this.#sideBar?.setRecognizing(false);
            this.#diagPanel?.setAllDisconnected();
        };

        this.#topics.mode.onChange(this.#modeTopicHandler);
        this.#topics.voiceCommand.onChange(this.#voiceTopicHandler);
        this.#topics.guConnected.onChange(this.#guTopicHandler);
        this.#topics.radomirServiceConnected.onChange(this.#radomirTopicHandler);
        this.#topics.ethercatMasterConnected.onChange(this.#ethercatTopicHandler);

        Topic.onConnected(this.#connectedHandler);
        Topic.onDisconnected(this.#disconnectedHandler);

        this.#modesPanel?.setMode(this.#normalizeMode(this.#topics.mode.value));
        this.#sideBar?.setConnected(Topic.isConnected);
        this.#syncDiagnostics();

        if (!Topic.isConnected) {
            this.#diagPanel?.setAllDisconnected();
        }

        this.#initialized = true;
    }

    /** @returns {void} */
    destroy() {
        if (!this.#initialized || !this.#topics) {
            return;
        }

        if (this.#recognitionResetTimer !== undefined) {
            clearTimeout(this.#recognitionResetTimer);
            this.#recognitionResetTimer = undefined;
        }

        this.#offModeChange?.();

        if (this.#modeTopicHandler) {
            this.#topics.mode.offChange(this.#modeTopicHandler);
        }

        if (this.#voiceTopicHandler) {
            this.#topics.voiceCommand.offChange(this.#voiceTopicHandler);
        }

        if (this.#guTopicHandler) {
            this.#topics.guConnected.offChange(this.#guTopicHandler);
        }

        if (this.#radomirTopicHandler) {
            this.#topics.radomirServiceConnected.offChange(this.#radomirTopicHandler);
        }

        if (this.#ethercatTopicHandler) {
            this.#topics.ethercatMasterConnected.offChange(this.#ethercatTopicHandler);
        }

        if (this.#connectedHandler) {
            Topic.offConnected(this.#connectedHandler);
        }

        if (this.#disconnectedHandler) {
            Topic.offDisconnected(this.#disconnectedHandler);
        }

        this.#modesPanel?.destroy();
        this.#sideBar?.destroy();
        this.#diagPanel?.destroy();
        this.#model?.destroy();

        this.#initialized = false;
    }

    /** @returns {void} */
    #composeLayout() {
        if (!this.#rootElement || !this.#mainElement) {
            return;
        }

        let modelElement = this.#model?.element;
        let modesElement = this.#modesPanel?.element;
        let sideBarElement = this.#sideBar?.element;
        let diagElement = this.#diagPanel?.element;

        this.#modelPanel?.attachModelElement(modelElement);
        this.#modelPanel?.attachModesPanelElement(modesElement);
        this.#modelPanel?.attachSideBarElement(sideBarElement);

        if (this.#modelPanel?.element) {
            this.#mainElement.append(this.#modelPanel.element);
        }

        this.#rootElement.append(this.#mainElement);
        if (diagElement) {
            this.#rootElement.append(diagElement);
        }
    }

    /**
     * @param {unknown} value
     * @returns {string}
     */
    #normalizeMode(value) {
        if (typeof value !== "string") {
            return "off";
        }

        let modeValue = value.trim().toLowerCase();
        if (!VALID_MODES.includes(modeValue)) {
            return "off";
        }

        return modeValue;
    }

    /**
     * @param {unknown} value
     * @returns {void}
     */
    #handleVoiceCommand(value) {
        if (value === undefined || value === null) {
            return;
        }

        let voiceText = String(value).trim();
        if (!voiceText) {
            return;
        }

        this.#sideBar?.pushCommand(voiceText);

        if (!this.#sideBar?.micEnabled) {
            return;
        }

        this.#sideBar?.setRecognizing(true);
        if (this.#recognitionResetTimer !== undefined) {
            clearTimeout(this.#recognitionResetTimer);
        }

        this.#recognitionResetTimer = window.setTimeout(() => {
            this.#sideBar?.setRecognizing(false);
        }, RECOGNITION_TIMEOUT_MS);
    }

    /** @returns {void} */
    #syncDiagnostics() {
        this.#diagPanel?.setServiceState(
            "gu",
            normalizeBooleanTopicValue(this.#topics.guConnected.value)
        );
        this.#diagPanel?.setServiceState(
            "radomir-service",
            normalizeBooleanTopicValue(this.#topics.radomirServiceConnected.value)
        );
        this.#diagPanel?.setServiceState(
            "ethercat-master",
            normalizeBooleanTopicValue(this.#topics.ethercatMasterConnected.value)
        );
    }
}

export {RadomirUi};
