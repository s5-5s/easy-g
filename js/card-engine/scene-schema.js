import {clampNumber, normalizeArray, normalizeText, toFiniteNumber} from "../shared/normalize.js";
import {normalizePointList, vectorFromArray} from "./vector.js";
import {resolveLabelStyle, resolveLineStyle, resolvePlaneStyle} from "./styles.js";

const DEFAULT_CAMERA = Object.freeze({
    yaw: 0.92,
    pitch: 0.56,
    zoom: 1,
});

const MIN_CAMERA_PITCH = -1.22;
const MAX_CAMERA_PITCH = 1.22;
const MIN_CAMERA_ZOOM = 0.55;
const MAX_CAMERA_ZOOM = 2.6;

function normalizeSize2(value, fallbackWidth = 2, fallbackHeight = fallbackWidth) {
    if (Array.isArray(value)) {
        return [
            Math.max(toFiniteNumber(value[0], fallbackWidth), 0),
            Math.max(toFiniteNumber(value[1], fallbackHeight), 0),
        ];
    }

    let sizeValue = Math.max(toFiniteNumber(value, fallbackWidth), 0);
    return [sizeValue, sizeValue];
}

function hasVectorDefinition(value) {
    return Array.isArray(value) && value.length >= 3;
}

function normalizePlaneItem(itemDefinition) {
    let points = normalizePointList(itemDefinition.points);
    let hasBasis = hasVectorDefinition(itemDefinition.u) && hasVectorDefinition(itemDefinition.v);
    if (points.length < 3 && !hasBasis) {
        return undefined;
    }

    let fallbackStyle = itemDefinition.color === "red" ? "plane.red" : "plane.black";
    return {
        type: "plane",
        ...resolvePlaneStyle(itemDefinition, fallbackStyle),
        origin: vectorFromArray(itemDefinition.origin),
        points,
        size: normalizeSize2(itemDefinition.size, 3.4, 2.4),
        u: vectorFromArray(itemDefinition.u, {x: 1, y: 0, z: 0}),
        v: vectorFromArray(itemDefinition.v, {x: 0, y: 0, z: 1}),
    };
}

function normalizeLineItem(itemDefinition) {
    let points = normalizePointList(itemDefinition.points);
    let hasEndpoints = hasVectorDefinition(itemDefinition.from) && hasVectorDefinition(itemDefinition.to);
    let hasDirection = hasVectorDefinition(itemDefinition.direction);
    if (points.length < 2 && !hasEndpoints && !hasDirection) {
        return undefined;
    }

    let fallbackStyle = itemDefinition.color === "red" ? "line.red" : "line.black";
    return {
        type: "line",
        ...resolveLineStyle(itemDefinition, fallbackStyle),
        direction: vectorFromArray(itemDefinition.direction, {x: 1, y: 0, z: 0}),
        from: vectorFromArray(itemDefinition.from),
        length: Math.max(toFiniteNumber(itemDefinition.length, 1), 0),
        origin: vectorFromArray(itemDefinition.origin),
        points,
        to: vectorFromArray(itemDefinition.to),
    };
}

function normalizeRightAngleItem(itemDefinition) {
    return {
        type: "right-angle",
        ...resolveLineStyle(itemDefinition, "right-angle.red"),
        origin: vectorFromArray(itemDefinition.origin),
        u: vectorFromArray(itemDefinition.u, {x: 0.3, y: 0, z: 0}),
        v: vectorFromArray(itemDefinition.v, {x: 0, y: 0.3, z: 0}),
    };
}

function normalizeAngleArcItem(itemDefinition) {
    if (!hasVectorDefinition(itemDefinition.u) || !hasVectorDefinition(itemDefinition.v)) {
        return undefined;
    }

    return {
        type: "angle-arc",
        ...resolveLineStyle(itemDefinition, "angle.red"),
        origin: vectorFromArray(itemDefinition.origin),
        radius: Math.max(toFiniteNumber(itemDefinition.radius, 0.42), 0),
        segments: clampNumber(Math.round(toFiniteNumber(itemDefinition.segments, 8)), 2, 24),
        u: vectorFromArray(itemDefinition.u, {x: 1, y: 0, z: 0}),
        v: vectorFromArray(itemDefinition.v, {x: 0, y: 1, z: 0}),
    };
}

function normalizeLabelItem(itemDefinition) {
    let labelText = normalizeText(itemDefinition.text);
    if (!labelText) {
        return undefined;
    }

    let fallbackStyle = itemDefinition.color === "red" ? "label.red" : "label.black";
    return {
        type: "label",
        ...resolveLabelStyle(itemDefinition, fallbackStyle),
        position: vectorFromArray(itemDefinition.position),
        text: labelText,
    };
}

function normalizeCardItem(itemDefinition) {
    if (!itemDefinition || typeof itemDefinition !== "object") {
        return undefined;
    }

    let itemType = normalizeText(itemDefinition.type);
    let itemNormalizers = {
        "angle-arc": normalizeAngleArcItem,
        label: normalizeLabelItem,
        line: normalizeLineItem,
        plane: normalizePlaneItem,
        "right-angle": normalizeRightAngleItem,
    };

    return itemNormalizers[itemType]?.(itemDefinition);
}

function normalizeCamera(cameraDefinition) {
    return {
        yaw: toFiniteNumber(cameraDefinition?.yaw, DEFAULT_CAMERA.yaw),
        pitch: clampNumber(
            toFiniteNumber(cameraDefinition?.pitch, DEFAULT_CAMERA.pitch),
            MIN_CAMERA_PITCH,
            MAX_CAMERA_PITCH
        ),
        zoom: clampNumber(
            toFiniteNumber(cameraDefinition?.zoom, DEFAULT_CAMERA.zoom),
            MIN_CAMERA_ZOOM,
            MAX_CAMERA_ZOOM
        ),
    };
}

function normalizeCardDefinition(cardDefinition) {
    let items = normalizeArray(cardDefinition?.items)
        .map((itemDefinition) => normalizeCardItem(itemDefinition))
        .filter(Boolean);

    return {
        id: normalizeText(cardDefinition?.id),
        subtitle: normalizeText(cardDefinition?.subtitle),
        title: normalizeText(cardDefinition?.title),
        statement: normalizeText(cardDefinition?.statement),
        hint: normalizeText(cardDefinition?.hint),
        camera: normalizeCamera(cardDefinition?.camera),
        items,
    };
}

export {
    MAX_CAMERA_PITCH,
    MAX_CAMERA_ZOOM,
    MIN_CAMERA_PITCH,
    MIN_CAMERA_ZOOM,
    normalizeCardDefinition,
    normalizeCardItem,
};
