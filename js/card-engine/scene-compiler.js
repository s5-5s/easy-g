import {clampNumber} from "../shared/normalize.js";
import {buildColor} from "./styles.js";
import {
    addVectors,
    createVector3,
    dotProduct,
    multiplyVector,
    normalizeVector,
    scaleVectorToLength,
    subtractVectors,
    vectorLength,
} from "./vector.js";
import {normalizeCardDefinition} from "./scene-schema.js";

const MIN_SCENE_RADIUS = 1.5;

function buildPlanePoints(sceneItem) {
    if (sceneItem.points.length >= 3) {
        return sceneItem.points;
    }

    let halfWidthVector = scaleVectorToLength(sceneItem.u, sceneItem.size[0] * 0.5);
    let halfHeightVector = scaleVectorToLength(sceneItem.v, sceneItem.size[1] * 0.5);

    return [
        subtractVectors(subtractVectors(sceneItem.origin, halfWidthVector), halfHeightVector),
        subtractVectors(addVectors(sceneItem.origin, halfWidthVector), halfHeightVector),
        addVectors(addVectors(sceneItem.origin, halfWidthVector), halfHeightVector),
        addVectors(subtractVectors(sceneItem.origin, halfWidthVector), halfHeightVector),
    ];
}

function buildLinePoints(sceneItem) {
    if (sceneItem.points.length >= 2) {
        return sceneItem.points;
    }

    if (vectorLength(subtractVectors(sceneItem.to, sceneItem.from)) > 0) {
        return [sceneItem.from, sceneItem.to];
    }

    let halfVector = scaleVectorToLength(sceneItem.direction, sceneItem.length * 0.5);
    return [
        subtractVectors(sceneItem.origin, halfVector),
        addVectors(sceneItem.origin, halfVector),
    ];
}

function buildRightAnglePoints(sceneItem) {
    let firstCorner = addVectors(sceneItem.origin, sceneItem.u);
    let secondCorner = addVectors(firstCorner, sceneItem.v);
    let thirdCorner = addVectors(sceneItem.origin, sceneItem.v);

    return [sceneItem.origin, firstCorner, secondCorner, thirdCorner];
}

function buildAngleArcPoints(sceneItem) {
    let firstVector = normalizeVector(sceneItem.u);
    let secondVector = normalizeVector(sceneItem.v);
    let angleValue = Math.acos(clampNumber(dotProduct(firstVector, secondVector), -1, 1));
    let points = [];

    for (let pointIndex = 0; pointIndex <= sceneItem.segments; pointIndex += 1) {
        let interpolation = pointIndex / sceneItem.segments;
        let directionVector = slerpDirection(firstVector, secondVector, angleValue, interpolation);
        points.push(addVectors(sceneItem.origin, multiplyVector(directionVector, sceneItem.radius)));
    }

    return points;
}

function slerpDirection(firstVector, secondVector, angleValue, interpolation) {
    if (angleValue <= 0.0001) {
        return firstVector;
    }

    let firstWeight = Math.sin((1 - interpolation) * angleValue) / Math.sin(angleValue);
    let secondWeight = Math.sin(interpolation * angleValue) / Math.sin(angleValue);
    return normalizeVector(addVectors(
        multiplyVector(firstVector, firstWeight),
        multiplyVector(secondVector, secondWeight)
    ));
}

function compilePlane(sceneItem) {
    let points = buildPlanePoints(sceneItem);
    return {
        depthPoints: points,
        fillStyle: buildColor(sceneItem.color, sceneItem.fillOpacity),
        lineWidth: sceneItem.outlineWidth,
        points,
        strokeStyle: buildColor(sceneItem.color, sceneItem.outlineOpacity),
    };
}

function compilePolyline(sceneItem, points) {
    return {
        depthPoints: points,
        lineWidth: sceneItem.width,
        points,
        strokeStyle: buildColor(sceneItem.color, sceneItem.opacity),
    };
}

function compileLabel(sceneItem) {
    return {
        fillStyle: buildColor(sceneItem.color, 1),
        fontSize: sceneItem.fontSize,
        position: sceneItem.position,
        text: sceneItem.text,
    };
}

function compileSceneItems(sceneItems) {
    let compiledItems = {
        labels: [],
        planes: [],
        polylines: [],
        pointsForBounds: [],
    };

    sceneItems.forEach((sceneItem) => {
        pushCompiledItem(compiledItems, sceneItem);
    });

    return compiledItems;
}

function pushCompiledItem(compiledItems, sceneItem) {
    if (sceneItem.type === "plane") {
        let planeItem = compilePlane(sceneItem);
        compiledItems.planes.push(planeItem);
        compiledItems.pointsForBounds.push(...planeItem.points);
    } else if (sceneItem.type === "label") {
        compiledItems.labels.push(compileLabel(sceneItem));
    } else {
        let points = buildPolylinePoints(sceneItem);
        compiledItems.polylines.push(compilePolyline(sceneItem, points));
        compiledItems.pointsForBounds.push(...points);
    }
}

function buildPolylinePoints(sceneItem) {
    if (sceneItem.type === "line") {
        return buildLinePoints(sceneItem);
    }

    if (sceneItem.type === "right-angle") {
        return buildRightAnglePoints(sceneItem);
    }

    if (sceneItem.type === "angle-arc") {
        return buildAngleArcPoints(sceneItem);
    }

    return [];
}

function measureSceneBounds(pointsForBounds) {
    if (pointsForBounds.length === 0) {
        return {center: createVector3(), radius: MIN_SCENE_RADIUS};
    }

    let minVector = createVector3(Infinity, Infinity, Infinity);
    let maxVector = createVector3(-Infinity, -Infinity, -Infinity);
    pointsForBounds.forEach((point) => {
        minVector.x = Math.min(minVector.x, point.x);
        minVector.y = Math.min(minVector.y, point.y);
        minVector.z = Math.min(minVector.z, point.z);
        maxVector.x = Math.max(maxVector.x, point.x);
        maxVector.y = Math.max(maxVector.y, point.y);
        maxVector.z = Math.max(maxVector.z, point.z);
    });

    let center = createVector3(
        (minVector.x + maxVector.x) * 0.5,
        (minVector.y + maxVector.y) * 0.5,
        (minVector.z + maxVector.z) * 0.5
    );

    return {center, radius: measureSceneRadius(pointsForBounds, center)};
}

function measureSceneRadius(pointsForBounds, center) {
    let radius = pointsForBounds.reduce((maxRadius, point) => {
        let offset = subtractVectors(point, center);
        return Math.max(maxRadius, vectorLength(offset));
    }, 0);

    return Math.max(radius, MIN_SCENE_RADIUS);
}

function compileCardDefinition(cardDefinition) {
    let normalizedCard = normalizeCardDefinition(cardDefinition);
    let compiledItems = compileSceneItems(normalizedCard.items);

    return {
        ...normalizedCard,
        bounds: measureSceneBounds(compiledItems.pointsForBounds),
        labels: compiledItems.labels,
        planes: compiledItems.planes,
        polylines: compiledItems.polylines,
    };
}

export {compileCardDefinition, compileSceneItems, measureSceneBounds};
