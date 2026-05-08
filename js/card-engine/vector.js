import {toFiniteNumber} from "../shared/normalize.js";

const ZERO_VECTOR = Object.freeze({x: 0, y: 0, z: 0});
const WORLD_UP_VECTOR = Object.freeze({x: 0, y: 1, z: 0});
const WORLD_SIDE_VECTOR = Object.freeze({x: 1, y: 0, z: 0});

function createVector3(xCoordinate = 0, yCoordinate = 0, zCoordinate = 0) {
    return {
        x: xCoordinate,
        y: yCoordinate,
        z: zCoordinate,
    };
}

function cloneVector(vector) {
    return createVector3(vector.x, vector.y, vector.z);
}

function vectorFromArray(value, fallbackVector = ZERO_VECTOR) {
    if (!Array.isArray(value) || value.length < 3) {
        return cloneVector(fallbackVector);
    }

    return createVector3(
        toFiniteNumber(value[0], fallbackVector.x),
        toFiniteNumber(value[1], fallbackVector.y),
        toFiniteNumber(value[2], fallbackVector.z)
    );
}

function normalizePointList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((pointDefinition) => vectorFromArray(pointDefinition));
}

function vectorToArray(vector) {
    return [vector.x, vector.y, vector.z];
}

function addVectors(leftVector, rightVector) {
    return createVector3(
        leftVector.x + rightVector.x,
        leftVector.y + rightVector.y,
        leftVector.z + rightVector.z
    );
}

function subtractVectors(leftVector, rightVector) {
    return createVector3(
        leftVector.x - rightVector.x,
        leftVector.y - rightVector.y,
        leftVector.z - rightVector.z
    );
}

function multiplyVector(vector, multiplier) {
    return createVector3(
        vector.x * multiplier,
        vector.y * multiplier,
        vector.z * multiplier
    );
}

function dotProduct(leftVector, rightVector) {
    return (
        leftVector.x * rightVector.x
        + leftVector.y * rightVector.y
        + leftVector.z * rightVector.z
    );
}

function crossProduct(leftVector, rightVector) {
    return createVector3(
        leftVector.y * rightVector.z - leftVector.z * rightVector.y,
        leftVector.z * rightVector.x - leftVector.x * rightVector.z,
        leftVector.x * rightVector.y - leftVector.y * rightVector.x
    );
}

function vectorLength(vector) {
    return Math.sqrt(dotProduct(vector, vector));
}

function normalizeVector(vector) {
    let lengthValue = vectorLength(vector);
    if (lengthValue <= 0) {
        return createVector3();
    }

    return multiplyVector(vector, 1 / lengthValue);
}

function scaleVectorToLength(vector, targetLength) {
    let normalizedVector = normalizeVector(vector);
    return multiplyVector(normalizedVector, targetLength);
}

export {
    WORLD_SIDE_VECTOR,
    WORLD_UP_VECTOR,
    ZERO_VECTOR,
    addVectors,
    cloneVector,
    createVector3,
    crossProduct,
    dotProduct,
    multiplyVector,
    normalizePointList,
    normalizeVector,
    scaleVectorToLength,
    subtractVectors,
    vectorFromArray,
    vectorLength,
    vectorToArray,
};
