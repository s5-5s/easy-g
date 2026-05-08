import {normalizeText} from "../shared/normalize.js";
import {buildCameraState, clampCameraPitch, clampCameraZoom} from "./camera.js";
import {compileCardDefinition} from "./scene-compiler.js";
import {PointerControls} from "./pointer-controls.js";
import {SceneRenderer} from "./renderer.js";

class CardEngine {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {HTMLCanvasElement} */
    #canvasElement;

    /** @type {HTMLElement} */
    #statusElement;

    /** @type {SceneRenderer} */
    #sceneRenderer;

    /** @type {PointerControls} */
    #pointerControls;

    /** @type {ResizeObserver | undefined} */
    #resizeObserver;

    /** @type {number | undefined} */
    #renderFrameId;

    /** @type {number} */
    #pixelRatio = 1;

    /** @type {number} */
    #lastCanvasWidth = 0;

    /** @type {number} */
    #lastCanvasHeight = 0;

    /** @type {ReturnType<typeof compileCardDefinition>} */
    #compiledScene = compileCardDefinition({});

    /** @type {{yaw: number, pitch: number, zoom: number}} */
    #camera = {yaw: 0.92, pitch: 0.56, zoom: 1};

    constructor(rootElement) {
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : document.createElement("div");
        this.#rootElement.classList.add("card-viewer");

        let canvasElement = document.createElement("canvas");
        canvasElement.setAttribute("aria-hidden", "true");
        let drawingContext = canvasElement.getContext("2d");
        if (!drawingContext) {
            throw new Error("2D canvas context is not available.");
        }

        this.#canvasElement = canvasElement;
        this.#statusElement = this.#createStatusElement();
        this.#sceneRenderer = new SceneRenderer(drawingContext);
        this.#pointerControls = new PointerControls(canvasElement, this.#rootElement, {
            rotate: this.#handleRotate.bind(this),
            zoom: this.#handleZoom.bind(this),
        });

        this.#rootElement.replaceChildren(this.#canvasElement, this.#statusElement);
        this.#observeResize();
        this.#handleResize();
    }

    async loadCard(cardUrl) {
        let response = await fetch(cardUrl);
        if (!response.ok) {
            throw new Error(`Card request failed: ${response.status}`);
        }

        this.applyCardDefinition(await response.json());
    }

    applyCardDefinition(cardDefinition) {
        this.#compiledScene = compileCardDefinition(cardDefinition);
        this.#camera = {...this.#compiledScene.camera};
        this.#requestRender();
    }

    setStatus(statusText = "") {
        let normalizedStatus = normalizeText(statusText);
        this.#statusElement.textContent = normalizedStatus;
        this.#statusElement.hidden = normalizedStatus.length === 0;
    }

    destroy() {
        if (this.#renderFrameId !== undefined) {
            cancelAnimationFrame(this.#renderFrameId);
            this.#renderFrameId = undefined;
        }

        this.#resizeObserver?.disconnect();
        this.#pointerControls.destroy();
        this.#rootElement.classList.remove("is-dragging");
    }

    #createStatusElement() {
        let statusElement = document.createElement("div");
        statusElement.className = "card-viewer-status";
        statusElement.hidden = true;
        statusElement.setAttribute("role", "status");
        statusElement.setAttribute("aria-live", "polite");
        return statusElement;
    }

    #observeResize() {
        if (typeof ResizeObserver !== "undefined") {
            this.#resizeObserver = new ResizeObserver(() => this.#handleResize());
            this.#resizeObserver.observe(this.#rootElement);
        }

        window.addEventListener("resize", this.#handleResize.bind(this));
    }

    #handleResize() {
        let viewportWidth = Math.max(this.#rootElement.clientWidth, 1);
        let viewportHeight = Math.max(this.#rootElement.clientHeight, 1);
        this.#pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        let canvasWidth = Math.round(viewportWidth * this.#pixelRatio);
        let canvasHeight = Math.round(viewportHeight * this.#pixelRatio);

        if (canvasWidth !== this.#lastCanvasWidth || canvasHeight !== this.#lastCanvasHeight) {
            this.#canvasElement.width = canvasWidth;
            this.#canvasElement.height = canvasHeight;
            this.#lastCanvasWidth = canvasWidth;
            this.#lastCanvasHeight = canvasHeight;
        }

        this.#requestRender();
    }

    #handleRotate(yawDelta, pitchDelta) {
        this.#camera.yaw += yawDelta;
        this.#camera.pitch = clampCameraPitch(this.#camera.pitch + pitchDelta);
        this.#requestRender();
    }

    #handleZoom(zoomMultiplier) {
        this.#camera.zoom = clampCameraZoom(this.#camera.zoom * zoomMultiplier);
        this.#requestRender();
    }

    #requestRender() {
        if (this.#renderFrameId !== undefined) {
            return;
        }

        this.#renderFrameId = requestAnimationFrame(() => {
            this.#renderFrameId = undefined;
            this.#render();
        });
    }

    #render() {
        let viewportSize = {
            height: this.#canvasElement.height,
            width: this.#canvasElement.width,
        };
        let cameraState = buildCameraState(
            this.#compiledScene.bounds,
            this.#camera,
            viewportSize,
            this.#rootElement.clientWidth
        );

        this.#sceneRenderer.render(this.#compiledScene, cameraState, viewportSize, this.#pixelRatio);
    }
}

export {CardEngine};
