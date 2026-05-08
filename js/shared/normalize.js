function toFiniteNumber(value, fallbackValue) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallbackValue;
}

function clampNumber(value, minValue, maxValue) {
    return Math.min(Math.max(value, minValue), maxValue);
}

function normalizeText(value, fallbackText = "") {
    return typeof value === "string" ? value.trim() || fallbackText : fallbackText;
}

function normalizeBoolean(value) {
    return value === true;
}

function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
}

export {clampNumber, normalizeArray, normalizeBoolean, normalizeText, toFiniteNumber};
