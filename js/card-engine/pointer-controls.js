const POINTER_ROTATION_SPEED = 0.008;
const WHEEL_ZOOM_SPEED = 0.0012;

function measurePointerGroup(activePointers) {
    let firstPointer = activePointers[0];
    let secondPointer = activePointers[1];
    let deltaX = secondPointer.x - firstPointer.x;
    let deltaY = secondPointer.y - firstPointer.y;

    return {
        centerX: (firstPointer.x + secondPointer.x) * 0.5,
        centerY: (firstPointer.y + secondPointer.y) * 0.5,
        distance: Math.hypot(deltaX, deltaY),
    };
}

class PointerControls {
    /** @type {HTMLCanvasElement} */
    #canvasElement;

    /** @type {HTMLElement} */
    #rootElement;

    /** @type {{rotate: (yawDelta: number, pitchDelta: number) => void, zoom: (zoomMultiplier: number) => void}} */
    #handlers;

    /** @type {AbortController} */
    #eventAbortController = new AbortController();

    /** @type {Map<number, {x: number, y: number}>} */
    #activePointers = new Map();

    /** @type {{x: number, y: number} | undefined} */
    #lastPointerPosition;

    /** @type {{distance: number, centerX: number, centerY: number} | undefined} */
    #lastPointerGroup;

    constructor(canvasElement, rootElement, handlers) {
        this.#canvasElement = canvasElement;
        this.#rootElement = rootElement;
        this.#handlers = handlers;
        this.#bindEvents();
    }

    destroy() {
        this.#eventAbortController.abort();
        this.#activePointers.clear();
        this.#rootElement.classList.remove("is-dragging");
    }

    #bindEvents() {
        let signal = this.#eventAbortController.signal;
        this.#canvasElement.addEventListener("pointerdown", this.#handlePointerDown.bind(this), {signal});
        this.#canvasElement.addEventListener("pointermove", this.#handlePointerMove.bind(this), {signal});
        this.#canvasElement.addEventListener("wheel", this.#handleWheel.bind(this), {passive: false, signal});
        window.addEventListener("pointerup", this.#handlePointerUp.bind(this), {signal});
        window.addEventListener("pointercancel", this.#handlePointerUp.bind(this), {signal});
    }

    #handlePointerDown(event) {
        this.#canvasElement.setPointerCapture(event.pointerId);
        this.#activePointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
        this.#rootElement.classList.add("is-dragging");
        this.#lastPointerPosition = {x: event.clientX, y: event.clientY};
        this.#lastPointerGroup = undefined;
    }

    #handlePointerMove(event) {
        if (!this.#activePointers.has(event.pointerId)) {
            return;
        }

        this.#activePointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
        this.#updateActivePointerGesture(event);
    }

    #updateActivePointerGesture(event) {
        if (this.#activePointers.size === 1) {
            this.#updateSinglePointerInteraction(event.clientX, event.clientY);
        }

        if (this.#activePointers.size === 2) {
            this.#updatePointerGroupInteraction();
        }
    }

    #handlePointerUp(event) {
        this.#activePointers.delete(event.pointerId);
        if (this.#activePointers.size === 0) {
            this.#rootElement.classList.remove("is-dragging");
            this.#lastPointerPosition = undefined;
            this.#lastPointerGroup = undefined;
            return;
        }

        this.#resetRemainingPointer();
    }

    #handleWheel(event) {
        event.preventDefault();
        this.#handlers.zoom(Math.exp(event.deltaY * WHEEL_ZOOM_SPEED));
    }

    #updateSinglePointerInteraction(pointerX, pointerY) {
        if (!this.#lastPointerPosition) {
            this.#lastPointerPosition = {x: pointerX, y: pointerY};
            return;
        }

        let deltaX = pointerX - this.#lastPointerPosition.x;
        let deltaY = pointerY - this.#lastPointerPosition.y;
        this.#handlers.rotate(-deltaX * POINTER_ROTATION_SPEED, deltaY * POINTER_ROTATION_SPEED);
        this.#lastPointerPosition = {x: pointerX, y: pointerY};
    }

    #updatePointerGroupInteraction() {
        let activePointers = [...this.#activePointers.values()];
        let pointerGroup = measurePointerGroup(activePointers);
        if (!this.#lastPointerGroup) {
            this.#lastPointerGroup = pointerGroup;
            return;
        }

        if (pointerGroup.distance > 0) {
            this.#handlers.zoom(this.#lastPointerGroup.distance / pointerGroup.distance);
        }

        this.#lastPointerGroup = pointerGroup;
    }

    #resetRemainingPointer() {
        if (this.#activePointers.size !== 1) {
            return;
        }

        this.#lastPointerPosition = [...this.#activePointers.values()][0];
        this.#lastPointerGroup = undefined;
    }
}

export {PointerControls};
