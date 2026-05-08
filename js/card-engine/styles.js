import {clampNumber, normalizeText, toFiniteNumber} from "../shared/normalize.js";

const COLOR_PALETTE = Object.freeze({
    black: Object.freeze({red: 17, green: 17, blue: 17}),
    red: Object.freeze({red: 196, green: 28, blue: 28}),
});

const STYLE_PRESETS = Object.freeze({
    "plane.black": Object.freeze({
        color: "black",
        fillOpacity: 0.08,
        outlineOpacity: 0.88,
        outlineWidth: 2,
    }),
    "plane.black.faint": Object.freeze({
        color: "black",
        fillOpacity: 0.05,
        outlineOpacity: 0.74,
        outlineWidth: 2,
    }),
    "plane.red": Object.freeze({
        color: "red",
        fillOpacity: 0.08,
        outlineOpacity: 0.9,
        outlineWidth: 2,
    }),
    "line.black": Object.freeze({
        color: "black",
        opacity: 0.9,
        width: 4,
    }),
    "line.black.strong": Object.freeze({
        color: "black",
        opacity: 1,
        width: 5,
    }),
    "line.black.soft": Object.freeze({
        color: "black",
        opacity: 0.45,
        width: 2,
    }),
    "line.red": Object.freeze({
        color: "red",
        opacity: 0.95,
        width: 4,
    }),
    "line.red.strong": Object.freeze({
        color: "red",
        opacity: 1,
        width: 5,
    }),
    "angle.red": Object.freeze({
        color: "red",
        opacity: 0.85,
        width: 2,
    }),
    "right-angle.red": Object.freeze({
        color: "red",
        opacity: 1,
        width: 3,
    }),
    "right-angle.black": Object.freeze({
        color: "black",
        opacity: 0.9,
        width: 2,
    }),
    "label.black": Object.freeze({
        color: "black",
        fontSize: 24,
    }),
    "label.red": Object.freeze({
        color: "red",
        fontSize: 24,
    }),
});

function normalizeColorName(value) {
    return value === "red" ? "red" : "black";
}

function buildColor(colorName, opacity = 1) {
    let colorDefinition = COLOR_PALETTE[normalizeColorName(colorName)];
    return (
        `rgba(${colorDefinition.red}, ${colorDefinition.green}, `
        + `${colorDefinition.blue}, ${opacity})`
    );
}

function getStylePreset(styleName, fallbackStyleName) {
    let normalizedStyleName = normalizeText(styleName, fallbackStyleName);
    return STYLE_PRESETS[normalizedStyleName] || STYLE_PRESETS[fallbackStyleName] || {};
}

function resolvePlaneStyle(itemDefinition, fallbackStyleName = "plane.black") {
    let preset = getStylePreset(itemDefinition.style, fallbackStyleName);
    return {
        color: normalizeColorName(itemDefinition.color ?? preset.color),
        fillOpacity: clampNumber(toFiniteNumber(itemDefinition.fillOpacity, preset.fillOpacity ?? 0.08), 0, 1),
        outlineOpacity: clampNumber(toFiniteNumber(itemDefinition.outlineOpacity, preset.outlineOpacity ?? 1), 0, 1),
        outlineWidth: clampNumber(toFiniteNumber(itemDefinition.outlineWidth, preset.outlineWidth ?? 2), 1, 6),
    };
}

function resolveLineStyle(itemDefinition, fallbackStyleName = "line.black") {
    let preset = getStylePreset(itemDefinition.style, fallbackStyleName);
    return {
        color: normalizeColorName(itemDefinition.color ?? preset.color),
        opacity: clampNumber(toFiniteNumber(itemDefinition.opacity, preset.opacity ?? 1), 0, 1),
        width: clampNumber(toFiniteNumber(itemDefinition.width, preset.width ?? 3), 1, 8),
    };
}

function resolveLabelStyle(itemDefinition, fallbackStyleName = "label.black") {
    let preset = getStylePreset(itemDefinition.style, fallbackStyleName);
    return {
        color: normalizeColorName(itemDefinition.color ?? preset.color),
        fontSize: clampNumber(toFiniteNumber(itemDefinition.fontSize, preset.fontSize ?? 22), 12, 36),
    };
}

export {
    STYLE_PRESETS,
    buildColor,
    normalizeColorName,
    resolveLabelStyle,
    resolveLineStyle,
    resolvePlaneStyle,
};
