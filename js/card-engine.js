const COLOR_PALETTE = Object.freeze({
    black: Object.freeze({red: 17, green: 17, blue: 17, hex: "#111111"}),
    red: Object.freeze({red: 196, green: 28, blue: 28, hex: "#c41c1c"}),
});

const DEFAULT_CARD_SUBTITLE = "";
const DEFAULT_CARD_TITLE = "";
const DEFAULT_CARD_STATEMENT = "";
const DEFAULT_CARD_HINT = "";

const DEFAULT_CAMERA_YAW = 0.92;
const DEFAULT_CAMERA_PITCH = 0.56;
const DEFAULT_CAMERA_ZOOM = 1;
const DEFAULT_FIELD_OF_VIEW = Math.PI / 3.15;

const MIN_DISTANCE_SCALE = 0.55;
const MAX_DISTANCE_SCALE = 2.6;
const MIN_CAMERA_PITCH = -1.22;
const MAX_CAMERA_PITCH = 1.22;
const MIN_SCENE_RADIUS = 1.5;
const MIN_CAMERA_DEPTH = 0.01;
const DESKTOP_VIEWPORT_MIN_WIDTH = 960;
const DESKTOP_FRAME_WIDTH_RATIO = 2 / 3;
const DESKTOP_FRAME_CENTER_X_RATIO = 2 / 3;

const POINTER_ROTATION_SPEED = 0.008;
const WHEEL_ZOOM_SPEED = 0.0012;

const WORLD_UP_VECTOR = Object.freeze({x: 0, y: 1, z: 0});
const WORLD_SIDE_VECTOR = Object.freeze({x: 1, y: 0, z: 0});

/**
 * @typedef {{x: number, y: number, z: number}} Vector3
 * @typedef {{screenX: number, screenY: number, depth: number}} ProjectedPoint
 * @typedef {{width: number, height: number}} ViewportSize
 */

/**
 * @param {number} xCoordinate
 * @param {number} yCoordinate
 * @param {number} zCoordinate
 * @returns {Vector3}
 */
function createVector3(xCoordinate = 0, yCoordinate = 0, zCoordinate = 0) {
    return {
        x: xCoordinate,
        y: yCoordinate,
        z: zCoordinate,
    };
}

/**
 * @param {unknown} value
 * @param {number} fallbackValue
 * @returns {number}
 */
function toFiniteNumber(value, fallbackValue) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallbackValue;
}

/**
 * @param {number} value
 * @param {number} minValue
 * @param {number} maxValue
 * @returns {number}
 */
function clampNumber(value, minValue, maxValue) {
    return Math.min(Math.max(value, minValue), maxValue);
}

/**
 * @param {unknown} value
 * @param {string} fallbackText
 * @returns {string}
 */
function normalizeText(value, fallbackText = "") {
    return typeof value === "string" ? value.trim() || fallbackText : fallbackText;
}

/**
 * @param {unknown} value
 * @returns {"black" | "red"}
 */
function normalizeColorName(value) {
    return value === "red" ? "red" : "black";
}

/**
 * @param {string} colorName
 * @param {number} opacity
 * @returns {string}
 */
function buildColor(colorName, opacity = 1) {
    let colorDefinition = COLOR_PALETTE[normalizeColorName(colorName)];
    return (
        `rgba(${colorDefinition.red}, ${colorDefinition.green}, `
        + `${colorDefinition.blue}, ${opacity})`
    );
}

/**
 * @param {unknown} value
 * @param {Vector3} fallbackVector
 * @returns {Vector3}
 */
function normalizeVector3(value, fallbackVector = createVector3()) {
    if (!Array.isArray(value) || value.length < 3) {
        return createVector3(fallbackVector.x, fallbackVector.y, fallbackVector.z);
    }

    return createVector3(
        toFiniteNumber(value[0], fallbackVector.x),
        toFiniteNumber(value[1], fallbackVector.y),
        toFiniteNumber(value[2], fallbackVector.z)
    );
}

/**
 * @param {Vector3} leftVector
 * @param {Vector3} rightVector
 * @returns {Vector3}
 */
function addVectors(leftVector, rightVector) {
    return createVector3(
        leftVector.x + rightVector.x,
        leftVector.y + rightVector.y,
        leftVector.z + rightVector.z
    );
}

/**
 * @param {Vector3} leftVector
 * @param {Vector3} rightVector
 * @returns {Vector3}
 */
function subtractVectors(leftVector, rightVector) {
    return createVector3(
        leftVector.x - rightVector.x,
        leftVector.y - rightVector.y,
        leftVector.z - rightVector.z
    );
}

/**
 * @param {Vector3} vector
 * @param {number} multiplier
 * @returns {Vector3}
 */
function multiplyVector(vector, multiplier) {
    return createVector3(
        vector.x * multiplier,
        vector.y * multiplier,
        vector.z * multiplier
    );
}

/**
 * @param {Vector3} leftVector
 * @param {Vector3} rightVector
 * @returns {number}
 */
function dotProduct(leftVector, rightVector) {
    return (
        leftVector.x * rightVector.x
        + leftVector.y * rightVector.y
        + leftVector.z * rightVector.z
    );
}

/**
 * @param {Vector3} leftVector
 * @param {Vector3} rightVector
 * @returns {Vector3}
 */
function crossProduct(leftVector, rightVector) {
    return createVector3(
        leftVector.y * rightVector.z - leftVector.z * rightVector.y,
        leftVector.z * rightVector.x - leftVector.x * rightVector.z,
        leftVector.x * rightVector.y - leftVector.y * rightVector.x
    );
}

/**
 * @param {Vector3} vector
 * @returns {number}
 */
function vectorLength(vector) {
    return Math.sqrt(dotProduct(vector, vector));
}

/**
 * @param {Vector3} vector
 * @returns {Vector3}
 */
function normalizeVector(vector) {
    let lengthValue = vectorLength(vector);
    if (lengthValue <= 0) {
        return createVector3();
    }

    return multiplyVector(vector, 1 / lengthValue);
}

/**
 * @param {unknown} value
 * @returns {Vector3[]}
 */
function normalizePointList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    let normalizedPoints = [];
    for (let pointIndex = 0; pointIndex < value.length; pointIndex += 1) {
        normalizedPoints.push(normalizeVector3(value[pointIndex]));
    }

    return normalizedPoints;
}

/**
 * @param {Vector3} originVector
 * @param {Vector3} uVector
 * @param {Vector3} vVector
 * @returns {Vector3[]}
 */
function buildRightAnglePoints(originVector, uVector, vVector) {
    let firstCorner = addVectors(originVector, uVector);
    let secondCorner = addVectors(firstCorner, vVector);
    let thirdCorner = addVectors(originVector, vVector);

    return [originVector, firstCorner, secondCorner, thirdCorner];
}

/**
 * @param {unknown} itemDefinition
 * @returns {object | undefined}
 */
function normalizeCardItem(itemDefinition) {
    if (!itemDefinition || typeof itemDefinition !== "object") {
        return undefined;
    }

    let itemType = normalizeText(itemDefinition.type);
    if (itemType === "plane") {
        let points = normalizePointList(itemDefinition.points);
        if (points.length < 3) {
            return undefined;
        }

        return {
            type: "plane",
            color: normalizeColorName(itemDefinition.color),
            fillOpacity: clampNumber(toFiniteNumber(itemDefinition.fillOpacity, 0.08), 0, 1),
            outlineOpacity: clampNumber(toFiniteNumber(itemDefinition.outlineOpacity, 1), 0, 1),
            outlineWidth: clampNumber(toFiniteNumber(itemDefinition.outlineWidth, 2), 1, 6),
            points,
        };
    }

    if (itemType === "line") {
        let points = normalizePointList(itemDefinition.points);
        if (points.length < 2) {
            return undefined;
        }

        return {
            type: "line",
            color: normalizeColorName(itemDefinition.color),
            opacity: clampNumber(toFiniteNumber(itemDefinition.opacity, 1), 0, 1),
            width: clampNumber(toFiniteNumber(itemDefinition.width, 3), 1, 8),
            points,
        };
    }

    if (itemType === "right-angle") {
        return {
            type: "right-angle",
            color: normalizeColorName(itemDefinition.color),
            opacity: clampNumber(toFiniteNumber(itemDefinition.opacity, 1), 0, 1),
            width: clampNumber(toFiniteNumber(itemDefinition.width, 3), 1, 8),
            origin: normalizeVector3(itemDefinition.origin),
            u: normalizeVector3(itemDefinition.u, createVector3(0.3, 0, 0)),
            v: normalizeVector3(itemDefinition.v, createVector3(0, 0.3, 0)),
        };
    }

    if (itemType === "label") {
        return {
            type: "label",
            text: normalizeText(itemDefinition.text),
            color: normalizeColorName(itemDefinition.color),
            fontSize: clampNumber(toFiniteNumber(itemDefinition.fontSize, 22), 12, 36),
            position: normalizeVector3(itemDefinition.position),
        };
    }

    return undefined;
}

/**
 * @param {unknown} cardDefinition
 * @returns {{
 *     subtitle: string,
 *     title: string,
 *     statement: string,
 *     hint: string,
 *     camera: {yaw: number, pitch: number, zoom: number},
 *     items: object[],
 * }}
 */
function normalizeCardDefinition(cardDefinition) {
    let items = [];
    let rawItems = Array.isArray(cardDefinition?.items) ? cardDefinition.items : [];

    for (let itemIndex = 0; itemIndex < rawItems.length; itemIndex += 1) {
        let normalizedItem = normalizeCardItem(rawItems[itemIndex]);
        if (normalizedItem) {
            items.push(normalizedItem);
        }
    }

    return {
        subtitle: normalizeText(cardDefinition?.subtitle, DEFAULT_CARD_SUBTITLE),
        title: normalizeText(cardDefinition?.title, DEFAULT_CARD_TITLE),
        statement: normalizeText(cardDefinition?.statement, DEFAULT_CARD_STATEMENT),
        hint: normalizeText(cardDefinition?.hint, DEFAULT_CARD_HINT),
        camera: {
            yaw: toFiniteNumber(cardDefinition?.camera?.yaw, DEFAULT_CAMERA_YAW),
            pitch: clampNumber(
                toFiniteNumber(cardDefinition?.camera?.pitch, DEFAULT_CAMERA_PITCH),
                MIN_CAMERA_PITCH,
                MAX_CAMERA_PITCH
            ),
            zoom: clampNumber(
                toFiniteNumber(cardDefinition?.camera?.zoom, DEFAULT_CAMERA_ZOOM),
                MIN_DISTANCE_SCALE,
                MAX_DISTANCE_SCALE
            ),
        },
        items,
    };
}

/**
 * @param {object} sceneItem
 * @returns {Vector3[]}
 */
function collectItemPoints(sceneItem) {
    if (sceneItem.type === "plane" || sceneItem.type === "line") {
        return sceneItem.points;
    }

    if (sceneItem.type === "right-angle") {
        return buildRightAnglePoints(sceneItem.origin, sceneItem.u, sceneItem.v);
    }

    return [];
}

/**
 * @param {object[]} sceneItems
 * @returns {{center: Vector3, radius: number}}
 */
function measureSceneBounds(sceneItems) {
    let scenePoints = [];
    for (let itemIndex = 0; itemIndex < sceneItems.length; itemIndex += 1) {
        scenePoints.push(...collectItemPoints(sceneItems[itemIndex]));
    }

    if (scenePoints.length === 0) {
        return {
            center: createVector3(),
            radius: MIN_SCENE_RADIUS,
        };
    }

    let minVector = createVector3(Infinity, Infinity, Infinity);
    let maxVector = createVector3(-Infinity, -Infinity, -Infinity);
    for (let pointIndex = 0; pointIndex < scenePoints.length; pointIndex += 1) {
        let point = scenePoints[pointIndex];
        minVector.x = Math.min(minVector.x, point.x);
        minVector.y = Math.min(minVector.y, point.y);
        minVector.z = Math.min(minVector.z, point.z);
        maxVector.x = Math.max(maxVector.x, point.x);
        maxVector.y = Math.max(maxVector.y, point.y);
        maxVector.z = Math.max(maxVector.z, point.z);
    }

    let centerVector = createVector3(
        (minVector.x + maxVector.x) * 0.5,
        (minVector.y + maxVector.y) * 0.5,
        (minVector.z + maxVector.z) * 0.5
    );

    let radiusValue = 0;
    for (let pointIndex = 0; pointIndex < scenePoints.length; pointIndex += 1) {
        let centerOffset = subtractVectors(scenePoints[pointIndex], centerVector);
        radiusValue = Math.max(radiusValue, vectorLength(centerOffset));
    }

    return {
        center: centerVector,
        radius: Math.max(radiusValue, MIN_SCENE_RADIUS),
    };
}

/**
 * @param {number} sceneRadius
 * @param {number} viewportAspect
 * @returns {number}
 */
function computeFitDistance(sceneRadius, viewportAspect) {
    let verticalFov = DEFAULT_FIELD_OF_VIEW;
    let horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(viewportAspect, 0.1));
    let limitingFov = Math.min(verticalFov, horizontalFov);

    return (sceneRadius / Math.sin(limitingFov / 2)) * 1.2;
}

/**
 * @param {Vector3} worldPoint
 * @param {{
 *     position: Vector3,
 *     forwardVector: Vector3,
 *     rightVector: Vector3,
 *     upVector: Vector3,
 *     fieldOfView: number,
 *     frameCenterX: number,
 *     frameCenterY: number,
 * }} cameraState
 * @param {ViewportSize} viewportSize
 * @returns {ProjectedPoint | undefined}
 */
function projectPoint(worldPoint, cameraState, viewportSize) {
    let relativeVector = subtractVectors(worldPoint, cameraState.position);
    let cameraX = dotProduct(relativeVector, cameraState.rightVector);
    let cameraY = dotProduct(relativeVector, cameraState.upVector);
    let cameraDepth = dotProduct(relativeVector, cameraState.forwardVector);

    if (cameraDepth <= MIN_CAMERA_DEPTH) {
        return undefined;
    }

    let focalLength = viewportSize.height * 0.5 / Math.tan(cameraState.fieldOfView / 2);
    return {
        screenX: cameraState.frameCenterX + cameraX * focalLength / cameraDepth,
        screenY: cameraState.frameCenterY - cameraY * focalLength / cameraDepth,
        depth: cameraDepth,
    };
}

/**
 * @param {Vector3[]} worldPoints
 * @param {object} cameraState
 * @param {ViewportSize} viewportSize
 * @returns {ProjectedPoint[]}
 */
function projectPoints(worldPoints, cameraState, viewportSize) {
    let projectedPoints = [];
    for (let pointIndex = 0; pointIndex < worldPoints.length; pointIndex += 1) {
        let projectedPoint = projectPoint(worldPoints[pointIndex], cameraState, viewportSize);
        if (!projectedPoint) {
            return [];
        }

        projectedPoints.push(projectedPoint);
    }

    return projectedPoints;
}

/**
 * @param {ProjectedPoint[]} projectedPoints
 * @returns {number}
 */
function measureAverageDepth(projectedPoints) {
    if (projectedPoints.length === 0) {
        return 0;
    }

    let depthSum = 0;
    for (let pointIndex = 0; pointIndex < projectedPoints.length; pointIndex += 1) {
        depthSum += projectedPoints[pointIndex].depth;
    }

    return depthSum / projectedPoints.length;
}

/**
 * @param {{x: number, y: number}[]} activePointers
 * @returns {{distance: number, centerX: number, centerY: number}}
 */
function measurePointerGroup(activePointers) {
    let firstPointer = activePointers[0];
    let secondPointer = activePointers[1];
    let deltaX = secondPointer.x - firstPointer.x;
    let deltaY = secondPointer.y - firstPointer.y;

    return {
        distance: Math.hypot(deltaX, deltaY),
        centerX: (firstPointer.x + secondPointer.x) * 0.5,
        centerY: (firstPointer.y + secondPointer.y) * 0.5,
    };
}

class CardEngine {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {HTMLCanvasElement} */
    #canvasElement;

    /** @type {CanvasRenderingContext2D} */
    #drawingContext;

    /** @type {HTMLElement} */
    #copyElement;

    /** @type {HTMLElement} */
    #subtitleElement;

    /** @type {HTMLElement} */
    #titleElement;

    /** @type {HTMLElement} */
    #statementElement;

    /** @type {HTMLElement} */
    #hintElement;

    /** @type {HTMLElement} */
    #statusElement;

    /** @type {AbortController} */
    #eventAbortController = new AbortController();

    /** @type {ResizeObserver | undefined} */
    #resizeObserver;

    /** @type {Map<number, {x: number, y: number}>} */
    #activePointers = new Map();

    /** @type {{x: number, y: number} | undefined} */
    #lastPointerPosition;

    /** @type {{distance: number, centerX: number, centerY: number} | undefined} */
    #lastPointerGroup;

    /** @type {number | undefined} */
    #renderFrameId;

    /** @type {number} */
    #pixelRatio = 1;

    /** @type {Vector3} */
    #sceneCenter = createVector3();

    /** @type {number} */
    #sceneRadius = MIN_SCENE_RADIUS;

    /** @type {number} */
    #cameraYaw = DEFAULT_CAMERA_YAW;

    /** @type {number} */
    #cameraPitch = DEFAULT_CAMERA_PITCH;

    /** @type {number} */
    #distanceScale = DEFAULT_CAMERA_ZOOM;

    /** @type {ReturnType<typeof normalizeCardDefinition>} */
    #cardDefinition = normalizeCardDefinition({});

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#rootElement =
            rootElement instanceof HTMLElement
                ? rootElement
                : document.createElement("div");
        this.#rootElement.classList.add("model-view");

        let sceneNodes = this.#createSceneNodes();
        this.#canvasElement = sceneNodes.canvasElement;
        this.#drawingContext = sceneNodes.drawingContext;
        this.#copyElement = sceneNodes.copyElement;
        this.#subtitleElement = sceneNodes.subtitleElement;
        this.#titleElement = sceneNodes.titleElement;
        this.#statementElement = sceneNodes.statementElement;
        this.#hintElement = sceneNodes.hintElement;
        this.#statusElement = sceneNodes.statusElement;

        this.#rootElement.replaceChildren(
            this.#canvasElement,
            this.#statusElement
        );

        this.#bindEvents();
        this.#observeResize();
        this.#handleResize();
    }

    /**
     * @param {string} cardUrl
     * @returns {Promise<void>}
     */
    async loadCard(cardUrl) {
        let response = await fetch(cardUrl);
        if (!response.ok) {
            throw new Error(`Card request failed: ${response.status}`);
        }

        this.#applyCardDefinition(normalizeCardDefinition(await response.json()));
    }

    /**
     * @param {string} statusText
     * @returns {void}
     */
    setStatus(statusText = "") {
        let normalizedStatus = normalizeText(statusText);
        this.#statusElement.textContent = normalizedStatus;
        this.#statusElement.hidden = normalizedStatus.length === 0;
    }

    /**
     * @returns {void}
     */
    destroy() {
        if (this.#renderFrameId !== undefined) {
            cancelAnimationFrame(this.#renderFrameId);
            this.#renderFrameId = undefined;
        }

        this.#resizeObserver?.disconnect();
        this.#eventAbortController.abort();
        this.#activePointers.clear();
        this.#rootElement.classList.remove("is-dragging");
    }

    /**
     * @returns {{
     *     canvasElement: HTMLCanvasElement,
     *     drawingContext: CanvasRenderingContext2D,
     *     copyElement: HTMLElement,
     *     subtitleElement: HTMLElement,
     *     titleElement: HTMLElement,
     *     statementElement: HTMLElement,
     *     hintElement: HTMLElement,
     *     statusElement: HTMLElement,
     * }}
     */
    #createSceneNodes() {
        let canvasElement = document.createElement("canvas");
        canvasElement.setAttribute("aria-hidden", "true");

        let drawingContext = canvasElement.getContext("2d");
        if (!drawingContext) {
            throw new Error("2D canvas context is not available.");
        }

        let copyElement = document.createElement("section");
        copyElement.className = "card-copy";
        copyElement.hidden = true;

        let subtitleElement = document.createElement("p");
        subtitleElement.className = "card-copy-subtitle";

        let titleElement = document.createElement("h1");
        titleElement.className = "card-copy-title";

        let statementElement = document.createElement("p");
        statementElement.className = "card-copy-statement";

        let hintElement = document.createElement("p");
        hintElement.className = "card-copy-hint";

        let statusElement = document.createElement("div");
        statusElement.className = "model-status";
        statusElement.hidden = true;
        statusElement.setAttribute("role", "status");
        statusElement.setAttribute("aria-live", "polite");

        copyElement.append(subtitleElement, titleElement, statementElement, hintElement);
        return {
            canvasElement,
            drawingContext,
            copyElement,
            subtitleElement,
            titleElement,
            statementElement,
            hintElement,
            statusElement,
        };
    }

    /** @returns {void} */
    #bindEvents() {
        let signal = this.#eventAbortController.signal;

        this.#canvasElement.addEventListener(
            "pointerdown",
            this.#handlePointerDown.bind(this),
            {signal}
        );
        this.#canvasElement.addEventListener(
            "pointermove",
            this.#handlePointerMove.bind(this),
            {signal}
        );
        this.#canvasElement.addEventListener(
            "wheel",
            this.#handleWheel.bind(this),
            {passive: false, signal}
        );

        window.addEventListener("pointerup", this.#handlePointerUp.bind(this), {signal});
        window.addEventListener("pointercancel", this.#handlePointerUp.bind(this), {signal});
        window.addEventListener("resize", this.#handleResize.bind(this), {signal});
    }

    /** @returns {void} */
    #observeResize() {
        if (typeof ResizeObserver === "undefined") {
            return;
        }

        this.#resizeObserver = new ResizeObserver(() => {
            this.#handleResize();
        });
        this.#resizeObserver.observe(this.#rootElement);
    }

    /**
     * @param {PointerEvent} event
     * @returns {void}
     */
    #handlePointerDown(event) {
        this.#canvasElement.setPointerCapture(event.pointerId);
        this.#activePointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });

        this.#rootElement.classList.add("is-dragging");
        this.#lastPointerPosition = {
            x: event.clientX,
            y: event.clientY,
        };
        this.#lastPointerGroup = undefined;
    }

    /**
     * @param {PointerEvent} event
     * @returns {void}
     */
    #handlePointerMove(event) {
        if (!this.#activePointers.has(event.pointerId)) {
            return;
        }

        this.#activePointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });

        if (this.#activePointers.size === 1) {
            this.#updateSinglePointerInteraction(event.clientX, event.clientY);
        }

        if (this.#activePointers.size === 2) {
            this.#updatePointerGroupInteraction();
        }

        this.#requestRender();
    }

    /**
     * @param {PointerEvent} event
     * @returns {void}
     */
    #handlePointerUp(event) {
        this.#activePointers.delete(event.pointerId);
        if (this.#activePointers.size === 0) {
            this.#rootElement.classList.remove("is-dragging");
            this.#lastPointerPosition = undefined;
            this.#lastPointerGroup = undefined;
            return;
        }

        if (this.#activePointers.size === 1) {
            let remainingPointer = [...this.#activePointers.values()][0];
            this.#lastPointerPosition = remainingPointer;
            this.#lastPointerGroup = undefined;
        }
    }

    /**
     * @param {PointerEvent} event
     * @returns {void}
     */
    #handleWheel(event) {
        event.preventDefault();

        let distanceMultiplier = Math.exp(event.deltaY * WHEEL_ZOOM_SPEED);
        this.#distanceScale = clampNumber(
            this.#distanceScale * distanceMultiplier,
            MIN_DISTANCE_SCALE,
            MAX_DISTANCE_SCALE
        );

        this.#requestRender();
    }

    /**
     * @param {number} pointerX
     * @param {number} pointerY
     * @returns {void}
     */
    #updateSinglePointerInteraction(pointerX, pointerY) {
        if (!this.#lastPointerPosition) {
            this.#lastPointerPosition = {x: pointerX, y: pointerY};
            return;
        }

        let deltaX = pointerX - this.#lastPointerPosition.x;
        let deltaY = pointerY - this.#lastPointerPosition.y;

        this.#cameraYaw -= deltaX * POINTER_ROTATION_SPEED;
        this.#cameraPitch = clampNumber(
            this.#cameraPitch + deltaY * POINTER_ROTATION_SPEED,
            MIN_CAMERA_PITCH,
            MAX_CAMERA_PITCH
        );

        this.#lastPointerPosition = {x: pointerX, y: pointerY};
    }

    /** @returns {void} */
    #updatePointerGroupInteraction() {
        let activePointers = [...this.#activePointers.values()];
        let pointerGroup = measurePointerGroup(activePointers);
        if (!this.#lastPointerGroup) {
            this.#lastPointerGroup = pointerGroup;
            return;
        }

        if (pointerGroup.distance > 0) {
            this.#distanceScale = clampNumber(
                this.#distanceScale * this.#lastPointerGroup.distance / pointerGroup.distance,
                MIN_DISTANCE_SCALE,
                MAX_DISTANCE_SCALE
            );
        }

        this.#lastPointerGroup = pointerGroup;
    }

    /** @returns {void} */
    #handleResize() {
        let viewportWidth = Math.max(this.#rootElement.clientWidth, 1);
        let viewportHeight = Math.max(this.#rootElement.clientHeight, 1);
        this.#pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        this.#canvasElement.width = Math.round(viewportWidth * this.#pixelRatio);
        this.#canvasElement.height = Math.round(viewportHeight * this.#pixelRatio);
        this.#requestRender();
    }

    /**
     * @param {ReturnType<typeof normalizeCardDefinition>} cardDefinition
     * @returns {void}
     */
    #applyCardDefinition(cardDefinition) {
        this.#cardDefinition = cardDefinition;

        let sceneMetrics = measureSceneBounds(cardDefinition.items);
        this.#sceneCenter = sceneMetrics.center;
        this.#sceneRadius = sceneMetrics.radius;
        this.#cameraYaw = cardDefinition.camera.yaw;
        this.#cameraPitch = cardDefinition.camera.pitch;
        this.#distanceScale = cardDefinition.camera.zoom;

        this.#applyCardCopy(cardDefinition);
        this.#requestRender();
    }

    /**
     * @param {ReturnType<typeof normalizeCardDefinition>} cardDefinition
     * @returns {void}
     */
    #applyCardCopy(cardDefinition) {
        this.#subtitleElement.textContent = cardDefinition.subtitle;
        this.#titleElement.textContent = cardDefinition.title;
        this.#statementElement.textContent = cardDefinition.statement;
        this.#hintElement.textContent = cardDefinition.hint;

        this.#subtitleElement.hidden = cardDefinition.subtitle.length === 0;
        this.#titleElement.hidden = cardDefinition.title.length === 0;
        this.#statementElement.hidden = cardDefinition.statement.length === 0;
        this.#hintElement.hidden = cardDefinition.hint.length === 0;

        this.#copyElement.hidden = (
            cardDefinition.subtitle.length === 0
            && cardDefinition.title.length === 0
            && cardDefinition.statement.length === 0
            && cardDefinition.hint.length === 0
        );
    }

    /** @returns {void} */
    #requestRender() {
        if (this.#renderFrameId !== undefined) {
            return;
        }

        this.#renderFrameId = requestAnimationFrame(() => {
            this.#renderFrameId = undefined;
            this.#render();
        });
    }

    /** @returns {void} */
    #render() {
        let viewportSize = {
            width: this.#canvasElement.width,
            height: this.#canvasElement.height,
        };

        this.#drawingContext.clearRect(0, 0, viewportSize.width, viewportSize.height);
        if (viewportSize.width === 0 || viewportSize.height === 0) {
            return;
        }

        let cameraState = this.#buildCameraState(viewportSize);
        let drawQueues = this.#buildDrawQueues(cameraState, viewportSize);

        this.#drawPlaneItems(drawQueues.planeItems);
        this.#drawPolylineItems(drawQueues.polylineItems);
        this.#drawLabelItems(drawQueues.labelItems);
    }

    /**
     * @param {ViewportSize} viewportSize
     * @returns {{frameWidth: number, frameCenterX: number, frameCenterY: number}}
     */
    #measureRenderFrame(viewportSize) {
        let rootWidth = this.#rootElement.clientWidth;
        if (rootWidth >= DESKTOP_VIEWPORT_MIN_WIDTH) {
            return {
                frameWidth: viewportSize.width * DESKTOP_FRAME_WIDTH_RATIO,
                frameCenterX: viewportSize.width * DESKTOP_FRAME_CENTER_X_RATIO,
                frameCenterY: viewportSize.height * 0.5,
            };
        }

        return {
            frameWidth: viewportSize.width,
            frameCenterX: viewportSize.width * 0.5,
            frameCenterY: viewportSize.height * 0.5,
        };
    }

    /**
     * @param {ViewportSize} viewportSize
     * @returns {{
     *     position: Vector3,
     *     forwardVector: Vector3,
     *     rightVector: Vector3,
     *     upVector: Vector3,
     *     fieldOfView: number,
     *     frameCenterX: number,
     *     frameCenterY: number,
     * }}
     */
    #buildCameraState(viewportSize) {
        let renderFrame = this.#measureRenderFrame(viewportSize);
        let viewportAspect = renderFrame.frameWidth / Math.max(viewportSize.height, 1);
        let fitDistance = computeFitDistance(this.#sceneRadius, viewportAspect);
        let distanceValue = fitDistance * this.#distanceScale;

        let horizontalDistance = distanceValue * Math.cos(this.#cameraPitch);
        let cameraOffset = createVector3(
            Math.sin(this.#cameraYaw) * horizontalDistance,
            Math.sin(this.#cameraPitch) * distanceValue,
            Math.cos(this.#cameraYaw) * horizontalDistance
        );

        let positionVector = addVectors(this.#sceneCenter, cameraOffset);
        let forwardVector = normalizeVector(subtractVectors(this.#sceneCenter, positionVector));
        let rightVector = normalizeVector(crossProduct(forwardVector, WORLD_UP_VECTOR));

        if (vectorLength(rightVector) <= 0) {
            rightVector = normalizeVector(crossProduct(forwardVector, WORLD_SIDE_VECTOR));
        }

        return {
            position: positionVector,
            forwardVector,
            rightVector,
            upVector: normalizeVector(crossProduct(rightVector, forwardVector)),
            fieldOfView: DEFAULT_FIELD_OF_VIEW,
            frameCenterX: renderFrame.frameCenterX,
            frameCenterY: renderFrame.frameCenterY,
        };
    }

    /**
     * @param {object} cameraState
     * @param {ViewportSize} viewportSize
     * @returns {{
     *     planeItems: object[],
     *     polylineItems: object[],
     *     labelItems: object[],
     * }}
     */
    #buildDrawQueues(cameraState, viewportSize) {
        let planeItems = [];
        let polylineItems = [];
        let labelItems = [];

        for (let itemIndex = 0; itemIndex < this.#cardDefinition.items.length; itemIndex += 1) {
            let sceneItem = this.#cardDefinition.items[itemIndex];
            this.#pushPlaneDrawable(sceneItem, cameraState, viewportSize, planeItems);
            this.#pushPolylineDrawable(sceneItem, cameraState, viewportSize, polylineItems);
            this.#pushLabelDrawable(sceneItem, cameraState, viewportSize, labelItems);
        }

        planeItems.sort((leftItem, rightItem) => rightItem.depth - leftItem.depth);
        polylineItems.sort((leftItem, rightItem) => rightItem.depth - leftItem.depth);
        labelItems.sort((leftItem, rightItem) => rightItem.depth - leftItem.depth);

        return {planeItems, polylineItems, labelItems};
    }

    /**
     * @param {object} sceneItem
     * @param {object} cameraState
     * @param {ViewportSize} viewportSize
     * @param {object[]} planeItems
     * @returns {void}
     */
    #pushPlaneDrawable(sceneItem, cameraState, viewportSize, planeItems) {
        if (sceneItem.type !== "plane") {
            return;
        }

        let projectedPoints = projectPoints(sceneItem.points, cameraState, viewportSize);
        if (projectedPoints.length < 3) {
            return;
        }

        planeItems.push({
            points: projectedPoints,
            depth: measureAverageDepth(projectedPoints),
            fillStyle: buildColor(sceneItem.color, sceneItem.fillOpacity),
            strokeStyle: buildColor(sceneItem.color, sceneItem.outlineOpacity),
            lineWidth: sceneItem.outlineWidth * this.#pixelRatio,
        });
    }

    /**
     * @param {object} sceneItem
     * @param {object} cameraState
     * @param {ViewportSize} viewportSize
     * @param {object[]} polylineItems
     * @returns {void}
     */
    #pushPolylineDrawable(sceneItem, cameraState, viewportSize, polylineItems) {
        let worldPoints = [];
        if (sceneItem.type === "line") {
            worldPoints = sceneItem.points;
        }

        if (sceneItem.type === "right-angle") {
            worldPoints = buildRightAnglePoints(sceneItem.origin, sceneItem.u, sceneItem.v);
        }

        if (worldPoints.length < 2) {
            return;
        }

        let projectedPoints = projectPoints(worldPoints, cameraState, viewportSize);
        if (projectedPoints.length < 2) {
            return;
        }

        polylineItems.push({
            points: projectedPoints,
            depth: measureAverageDepth(projectedPoints),
            strokeStyle: buildColor(sceneItem.color, sceneItem.opacity),
            lineWidth: sceneItem.width * this.#pixelRatio,
        });
    }

    /**
     * @param {object} sceneItem
     * @param {object} cameraState
     * @param {ViewportSize} viewportSize
     * @param {object[]} labelItems
     * @returns {void}
     */
    #pushLabelDrawable(sceneItem, cameraState, viewportSize, labelItems) {
        if (sceneItem.type !== "label" || sceneItem.text.length === 0) {
            return;
        }

        let projectedPoint = projectPoint(sceneItem.position, cameraState, viewportSize);
        if (!projectedPoint) {
            return;
        }

        labelItems.push({
            text: sceneItem.text,
            point: projectedPoint,
            depth: projectedPoint.depth,
            fillStyle: buildColor(sceneItem.color, 1),
            fontSize: sceneItem.fontSize * this.#pixelRatio,
        });
    }

    /**
     * @param {object[]} planeItems
     * @returns {void}
     */
    #drawPlaneItems(planeItems) {
        for (let itemIndex = 0; itemIndex < planeItems.length; itemIndex += 1) {
            let planeItem = planeItems[itemIndex];
            this.#drawingContext.beginPath();
            this.#tracePath(planeItem.points);
            this.#drawingContext.closePath();
            this.#drawingContext.fillStyle = planeItem.fillStyle;
            this.#drawingContext.fill();
            this.#drawingContext.lineWidth = planeItem.lineWidth;
            this.#drawingContext.strokeStyle = planeItem.strokeStyle;
            this.#drawingContext.stroke();
        }
    }

    /**
     * @param {object[]} polylineItems
     * @returns {void}
     */
    #drawPolylineItems(polylineItems) {
        this.#drawingContext.lineCap = "round";
        this.#drawingContext.lineJoin = "round";

        for (let itemIndex = 0; itemIndex < polylineItems.length; itemIndex += 1) {
            let polylineItem = polylineItems[itemIndex];
            this.#drawingContext.beginPath();
            this.#tracePath(polylineItem.points);
            this.#drawingContext.lineWidth = polylineItem.lineWidth;
            this.#drawingContext.strokeStyle = polylineItem.strokeStyle;
            this.#drawingContext.stroke();
        }
    }

    /**
     * @param {object[]} labelItems
     * @returns {void}
     */
    #drawLabelItems(labelItems) {
        this.#drawingContext.textAlign = "center";
        this.#drawingContext.textBaseline = "middle";

        for (let itemIndex = 0; itemIndex < labelItems.length; itemIndex += 1) {
            let labelItem = labelItems[itemIndex];
            this.#drawingContext.font = `600 ${labelItem.fontSize}px "Trebuchet MS", sans-serif`;
            this.#drawingContext.lineWidth = Math.max(2, labelItem.fontSize * 0.22);
            this.#drawingContext.strokeStyle = "rgba(255, 255, 255, 0.96)";
            this.#drawingContext.strokeText(
                labelItem.text,
                labelItem.point.screenX,
                labelItem.point.screenY
            );
            this.#drawingContext.fillStyle = labelItem.fillStyle;
            this.#drawingContext.fillText(
                labelItem.text,
                labelItem.point.screenX,
                labelItem.point.screenY
            );
        }
    }

    /**
     * @param {ProjectedPoint[]} projectedPoints
     * @returns {void}
     */
    #tracePath(projectedPoints) {
        if (projectedPoints.length === 0) {
            return;
        }

        this.#drawingContext.moveTo(projectedPoints[0].screenX, projectedPoints[0].screenY);
        for (let pointIndex = 1; pointIndex < projectedPoints.length; pointIndex += 1) {
            this.#drawingContext.lineTo(
                projectedPoints[pointIndex].screenX,
                projectedPoints[pointIndex].screenY
            );
        }
    }
}

export {CardEngine};
