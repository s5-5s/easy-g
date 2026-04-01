/**
 * @param {string} themeValue
 * @returns {{baseColor: number, accentColor: number, grayColor: number, textColorCss: string}}
 */
export function createThemePalette(themeValue) {
    let isDark = themeValue === "dark";
    let baseColor = isDark ? 0xffffff : 0x000000;

    return {
        baseColor,
        accentColor: 0xff3b30,
        grayColor: baseColor,
        textColorCss: isDark ? "#ffffff" : "#000000"
    };
}

/**
 * @param {string} modelKey
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @param {{baseColor: number, accentColor: number, grayColor: number, textColorCss: string}} paletteObject
 * @returns {{groupObject: import("./vendor/three.module.js").Group, cameraPosition: import("./vendor/three.module.js").Vector3, targetPosition: import("./vendor/three.module.js").Vector3}}
 */
export function createTopicModel(modelKey, THREE, paletteObject) {
    void modelKey;
    return createCubeSectionModel(THREE, paletteObject);
}

/**
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @param {{baseColor: number, accentColor: number, grayColor: number, textColorCss: string}} paletteObject
 * @returns {{groupObject: import("./vendor/three.module.js").Group, cameraPosition: import("./vendor/three.module.js").Vector3, targetPosition: import("./vendor/three.module.js").Vector3}}
 */
function createCubeSectionModel(THREE, paletteObject) {
    let groupObject = new THREE.Group();

    let cubeVertices = [
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(1, 1, -1),
        new THREE.Vector3(-1, 1, -1),
        new THREE.Vector3(-1, -1, 1),
        new THREE.Vector3(1, -1, 1),
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(-1, 1, 1)
    ];

    let cubeEdges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    cubeEdges.forEach((edgePair, edgeIndex) => {
        let startPoint = cubeVertices[edgePair[0]];
        let endPoint = cubeVertices[edgePair[1]];
        let edgeColor = edgeIndex < 8 ? paletteObject.baseColor : paletteObject.grayColor;
        groupObject.add(createThickSegment(startPoint, endPoint, edgeColor, 0.046, THREE));
    });

    let normalVector = new THREE.Vector3(1, 1, 1).normalize();
    let planeConstant = 0.22;

    let sectionPoints = findCubeSectionPoints(normalVector, planeConstant, cubeVertices, cubeEdges, THREE);
    if (sectionPoints.length >= 3) {
        groupObject.add(createFilledPolygon(sectionPoints, paletteObject.accentColor, 0.32, THREE));
        addPolylineAsSegments(groupObject, sectionPoints, true, paletteObject.accentColor, 0.054, THREE);

        sectionPoints.forEach((sectionPoint) => {
            groupObject.add(createPointSphere(sectionPoint, paletteObject.accentColor, 0.075, THREE));
        });
    }

    let planePoint = normalVector.clone().multiplyScalar(planeConstant);
    let sectionPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 3.2),
        new THREE.MeshBasicMaterial({
            color: paletteObject.accentColor,
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    sectionPlane.position.copy(planePoint);
    sectionPlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalVector);
    groupObject.add(sectionPlane);

    groupObject.add(
        createTextSprite("сечение", paletteObject.textColorCss, new THREE.Vector3(0.2, -1.45, 0.96), 0.86, THREE)
    );

    return {
        groupObject,
        cameraPosition: new THREE.Vector3(5.6, 3.7, 6.1),
        targetPosition: new THREE.Vector3(0, 0, 0)
    };
}

/**
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @param {{baseColor: number, accentColor: number, grayColor: number, textColorCss: string}} paletteObject
 * @returns {{groupObject: import("./vendor/three.module.js").Group, cameraPosition: import("./vendor/three.module.js").Vector3, targetPosition: import("./vendor/three.module.js").Vector3}}
 */
function createTriangleSumModel(THREE, paletteObject) {
    let groupObject = new THREE.Group();

    let pointA = new THREE.Vector3(-2.5, -1.3, 0);
    let pointB = new THREE.Vector3(2.3, -1.3, 0);
    let pointC = new THREE.Vector3(-0.7, 2.1, 0);

    addPolylineAsSegments(groupObject, [pointA, pointB, pointC], true, paletteObject.baseColor, 0.056, THREE);

    let arcPoints = [];
    let arcSteps = 18;
    let startAngle = Math.PI * 0.02;
    let endAngle = Math.PI * 0.73;
    for (let stepIndex = 0; stepIndex <= arcSteps; stepIndex += 1) {
        let angleValue = startAngle + ((endAngle - startAngle) * stepIndex) / arcSteps;
        arcPoints.push(
            new THREE.Vector3(
                pointA.x + Math.cos(angleValue) * 0.66,
                pointA.y + Math.sin(angleValue) * 0.66,
                0
            )
        );
    }
    addPolylineAsSegments(groupObject, arcPoints, false, paletteObject.accentColor, 0.03, THREE);

    groupObject.add(createPointSphere(pointA, paletteObject.accentColor, 0.08, THREE));
    groupObject.add(createPointSphere(pointB, paletteObject.grayColor, 0.08, THREE));
    groupObject.add(createPointSphere(pointC, paletteObject.grayColor, 0.08, THREE));

    groupObject.add(createTextSprite("α+β+γ=180°", paletteObject.textColorCss, new THREE.Vector3(0.28, 2.45, 0), 1.1, THREE));

    return {
        groupObject,
        cameraPosition: new THREE.Vector3(0.35, 0.82, 7.2),
        targetPosition: new THREE.Vector3(0, 0.35, 0)
    };
}

/**
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @param {{baseColor: number, accentColor: number, grayColor: number, textColorCss: string}} paletteObject
 * @returns {{groupObject: import("./vendor/three.module.js").Group, cameraPosition: import("./vendor/three.module.js").Vector3, targetPosition: import("./vendor/three.module.js").Vector3}}
 */
function createCircleChordModel(THREE, paletteObject) {
    let groupObject = new THREE.Group();

    let ringObject = new THREE.Mesh(
        new THREE.TorusGeometry(2.3, 0.06, 16, 110),
        new THREE.MeshBasicMaterial({color: paletteObject.baseColor})
    );
    groupObject.add(ringObject);

    let pointA = new THREE.Vector3(Math.cos(Math.PI / 6) * 2.3, Math.sin(Math.PI / 6) * 2.3, 0);
    let pointB = new THREE.Vector3(Math.cos((Math.PI * 5) / 6) * 2.3, Math.sin((Math.PI * 5) / 6) * 2.3, 0);
    let centerPoint = new THREE.Vector3(0, 0, 0);

    groupObject.add(createThickSegment(pointA, pointB, paletteObject.accentColor, 0.046, THREE));
    groupObject.add(createThickSegment(centerPoint, pointA, paletteObject.grayColor, 0.036, THREE));
    groupObject.add(createThickSegment(centerPoint, pointB, paletteObject.grayColor, 0.036, THREE));

    groupObject.add(createPointSphere(centerPoint, paletteObject.accentColor, 0.074, THREE));

    groupObject.add(createTextSprite("хорда AB", paletteObject.textColorCss, new THREE.Vector3(0.15, 0.82, 0), 0.9, THREE));

    return {
        groupObject,
        cameraPosition: new THREE.Vector3(0, 0.65, 7.8),
        targetPosition: new THREE.Vector3(0, 0, 0)
    };
}

/**
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @param {{baseColor: number, accentColor: number, grayColor: number, textColorCss: string}} paletteObject
 * @returns {{groupObject: import("./vendor/three.module.js").Group, cameraPosition: import("./vendor/three.module.js").Vector3, targetPosition: import("./vendor/three.module.js").Vector3}}
 */
function createParallelTransversalModel(THREE, paletteObject) {
    let groupObject = new THREE.Group();

    let topStart = new THREE.Vector3(-3.2, 1.4, 0);
    let topEnd = new THREE.Vector3(3.2, 1.4, 0);
    let bottomStart = new THREE.Vector3(-3.2, -1.4, 0);
    let bottomEnd = new THREE.Vector3(3.2, -1.4, 0);

    let transStart = new THREE.Vector3(-2.4, -2.4, 0);
    let transEnd = new THREE.Vector3(2.5, 2.7, 0);

    groupObject.add(createThickSegment(topStart, topEnd, paletteObject.baseColor, 0.053, THREE));
    groupObject.add(createThickSegment(bottomStart, bottomEnd, paletteObject.grayColor, 0.053, THREE));
    groupObject.add(createThickSegment(transStart, transEnd, paletteObject.accentColor, 0.042, THREE));

    let topHit = intersectAtY(topStart.y, transStart, transEnd, THREE);
    let bottomHit = intersectAtY(bottomStart.y, transStart, transEnd, THREE);

    groupObject.add(createPointSphere(topHit, paletteObject.accentColor, 0.072, THREE));
    groupObject.add(createPointSphere(bottomHit, paletteObject.accentColor, 0.072, THREE));

    groupObject.add(createTextSprite("∠1=∠2", paletteObject.textColorCss, new THREE.Vector3(0.32, 0.22, 0), 1.02, THREE));

    return {
        groupObject,
        cameraPosition: new THREE.Vector3(0.15, 0.6, 8.7),
        targetPosition: new THREE.Vector3(0, 0, 0)
    };
}

/**
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @param {{baseColor: number, accentColor: number, grayColor: number, textColorCss: string}} paletteObject
 * @returns {{groupObject: import("./vendor/three.module.js").Group, cameraPosition: import("./vendor/three.module.js").Vector3, targetPosition: import("./vendor/three.module.js").Vector3}}
 */
function createTriangleSimilarityModel(THREE, paletteObject) {
    let groupObject = new THREE.Group();

    let pointA = new THREE.Vector3(-2.9, -1.9, 0);
    let pointB = new THREE.Vector3(-0.1, -1.9, 0);
    let pointC = new THREE.Vector3(-1.9, 1.5, 0);

    let pointA2 = new THREE.Vector3(0.9, -1.1, 0);
    let pointB2 = new THREE.Vector3(2.4, -1.1, 0);
    let pointC2 = new THREE.Vector3(1.45, 0.92, 0);

    addPolylineAsSegments(groupObject, [pointA, pointB, pointC], true, paletteObject.baseColor, 0.052, THREE);
    addPolylineAsSegments(groupObject, [pointA2, pointB2, pointC2], true, paletteObject.grayColor, 0.052, THREE);

    groupObject.add(createThickSegment(pointA, pointA2, paletteObject.accentColor, 0.026, THREE));
    groupObject.add(createThickSegment(pointB, pointB2, paletteObject.accentColor, 0.026, THREE));
    groupObject.add(createThickSegment(pointC, pointC2, paletteObject.accentColor, 0.026, THREE));

    groupObject.add(createTextSprite("k", paletteObject.textColorCss, new THREE.Vector3(0.08, 0.38, 0), 1, THREE));

    return {
        groupObject,
        cameraPosition: new THREE.Vector3(0.12, 0.75, 8.9),
        targetPosition: new THREE.Vector3(0, 0.15, 0)
    };
}

/**
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @param {{baseColor: number, accentColor: number, grayColor: number, textColorCss: string}} paletteObject
 * @returns {{groupObject: import("./vendor/three.module.js").Group, cameraPosition: import("./vendor/three.module.js").Vector3, targetPosition: import("./vendor/three.module.js").Vector3}}
 */
function createPythagorasModel(THREE, paletteObject) {
    let groupObject = new THREE.Group();

    let pointA = new THREE.Vector3(0, 0, 0);
    let pointB = new THREE.Vector3(3.8, 0, 0);
    let pointC = new THREE.Vector3(0, 2.9, 0);

    groupObject.add(createThickSegment(pointA, pointB, paletteObject.baseColor, 0.056, THREE));
    groupObject.add(createThickSegment(pointA, pointC, paletteObject.grayColor, 0.056, THREE));
    groupObject.add(createThickSegment(pointB, pointC, paletteObject.accentColor, 0.056, THREE));

    let squareAB = [pointA, pointB, new THREE.Vector3(3.8, -3.8, 0), new THREE.Vector3(0, -3.8, 0)];
    let squareAC = [pointA, pointC, new THREE.Vector3(-2.9, 2.9, 0), new THREE.Vector3(-2.9, 0, 0)];

    addPolylineAsSegments(groupObject, squareAB, true, paletteObject.grayColor, 0.034, THREE);
    addPolylineAsSegments(groupObject, squareAC, true, paletteObject.grayColor, 0.034, THREE);

    groupObject.add(createTextSprite("c²=a²+b²", paletteObject.textColorCss, new THREE.Vector3(2.2, 3.45, 0), 1.1, THREE));

    return {
        groupObject,
        cameraPosition: new THREE.Vector3(1.2, 1.4, 9.2),
        targetPosition: new THREE.Vector3(1.2, 0.65, 0)
    };
}

/**
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @param {{baseColor: number, accentColor: number, grayColor: number, textColorCss: string}} paletteObject
 * @returns {{groupObject: import("./vendor/three.module.js").Group, cameraPosition: import("./vendor/three.module.js").Vector3, targetPosition: import("./vendor/three.module.js").Vector3}}
 */
function createLinePlaneModel(THREE, paletteObject) {
    let groupObject = new THREE.Group();

    let planeObject = new THREE.Mesh(
        new THREE.PlaneGeometry(6.2, 6.2),
        new THREE.MeshBasicMaterial({
            color: paletteObject.accentColor,
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    planeObject.rotation.x = -Math.PI / 2;
    groupObject.add(planeObject);

    let lineStart = new THREE.Vector3(-2.4, 2.5, -2.1);
    let lineEnd = new THREE.Vector3(2.2, -2.2, 2.1);
    let planeHit = new THREE.Vector3(0, 0, 0);

    groupObject.add(createThickSegment(lineStart, lineEnd, paletteObject.baseColor, 0.052, THREE));
    groupObject.add(createPointSphere(planeHit, paletteObject.accentColor, 0.08, THREE));
    groupObject.add(
        createThickSegment(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 1.35, 0),
            paletteObject.accentColor,
            0.032,
            THREE
        )
    );

    groupObject.add(createTextSprite("точка H", paletteObject.textColorCss, new THREE.Vector3(0.72, 0.2, 0.65), 0.92, THREE));

    return {
        groupObject,
        cameraPosition: new THREE.Vector3(5.8, 3.9, 5.5),
        targetPosition: new THREE.Vector3(0, 0.2, 0)
    };
}

/**
 * @param {import("./vendor/three.module.js").Vector3} pointStart
 * @param {import("./vendor/three.module.js").Vector3} pointEnd
 * @param {number} colorValue
 * @param {number} radiusValue
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @returns {import("./vendor/three.module.js").Mesh}
 */
function createThickSegment(pointStart, pointEnd, colorValue, radiusValue, THREE) {
    let segmentVector = pointEnd.clone().sub(pointStart);
    let segmentLength = segmentVector.length();

    let segmentObject = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusValue, radiusValue, segmentLength, 12),
        new THREE.MeshBasicMaterial({color: colorValue})
    );

    let middlePoint = pointStart.clone().add(pointEnd).multiplyScalar(0.5);
    segmentObject.position.copy(middlePoint);

    let directionVector = segmentVector.clone().normalize();
    segmentObject.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), directionVector);

    return segmentObject;
}

/**
 * @param {import("./vendor/three.module.js").Group} groupObject
 * @param {Array<import("./vendor/three.module.js").Vector3>} pointsArray
 * @param {boolean} isClosed
 * @param {number} colorValue
 * @param {number} radiusValue
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @returns {void}
 */
function addPolylineAsSegments(groupObject, pointsArray, isClosed, colorValue, radiusValue, THREE) {
    if (!Array.isArray(pointsArray) || pointsArray.length < 2) {
        return;
    }

    for (let pointIndex = 0; pointIndex < pointsArray.length - 1; pointIndex += 1) {
        groupObject.add(
            createThickSegment(pointsArray[pointIndex], pointsArray[pointIndex + 1], colorValue, radiusValue, THREE)
        );
    }

    if (isClosed) {
        groupObject.add(
            createThickSegment(
                pointsArray[pointsArray.length - 1],
                pointsArray[0],
                colorValue,
                radiusValue,
                THREE
            )
        );
    }
}

/**
 * @param {import("./vendor/three.module.js").Vector3} positionVector
 * @param {number} colorValue
 * @param {number} radiusValue
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @returns {import("./vendor/three.module.js").Mesh}
 */
function createPointSphere(positionVector, colorValue, radiusValue, THREE) {
    let pointObject = new THREE.Mesh(
        new THREE.SphereGeometry(radiusValue, 16, 12),
        new THREE.MeshBasicMaterial({color: colorValue})
    );
    pointObject.position.copy(positionVector);
    return pointObject;
}

/**
 * @param {string} textValue
 * @param {string} textColorCss
 * @param {import("./vendor/three.module.js").Vector3} positionVector
 * @param {number} scaleFactor
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @returns {import("./vendor/three.module.js").Sprite}
 */
function createTextSprite(textValue, textColorCss, positionVector, scaleFactor, THREE) {
    let canvasObject = document.createElement("canvas");
    canvasObject.width = 1024;
    canvasObject.height = 512;

    let drawingContext = canvasObject.getContext("2d");
    if (!drawingContext) {
        return new THREE.Sprite();
    }

    drawingContext.clearRect(0, 0, canvasObject.width, canvasObject.height);
    drawingContext.fillStyle = textColorCss;
    drawingContext.font = '700 118px "SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif';
    drawingContext.textAlign = "center";
    drawingContext.textBaseline = "middle";
    drawingContext.fillText(textValue, canvasObject.width / 2, canvasObject.height / 2);

    let textureObject = new THREE.CanvasTexture(canvasObject);
    textureObject.needsUpdate = true;

    let spriteObject = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: textureObject,
            transparent: true,
            depthTest: false,
            depthWrite: false
        })
    );
    spriteObject.scale.set(2.5 * scaleFactor, 1.2 * scaleFactor, 1);
    spriteObject.position.copy(positionVector);
    return spriteObject;
}

/**
 * @param {number} levelY
 * @param {import("./vendor/three.module.js").Vector3} pointStart
 * @param {import("./vendor/three.module.js").Vector3} pointEnd
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @returns {import("./vendor/three.module.js").Vector3}
 */
function intersectAtY(levelY, pointStart, pointEnd, THREE) {
    let denominatorValue = pointEnd.y - pointStart.y;
    if (Math.abs(denominatorValue) < 0.000001) {
        return pointStart.clone();
    }

    let factorValue = (levelY - pointStart.y) / denominatorValue;
    return new THREE.Vector3(
        pointStart.x + (pointEnd.x - pointStart.x) * factorValue,
        levelY,
        pointStart.z + (pointEnd.z - pointStart.z) * factorValue
    );
}

/**
 * @param {Array<import("./vendor/three.module.js").Vector3>} polygonPoints
 * @param {number} colorValue
 * @param {number} opacityValue
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @returns {import("./vendor/three.module.js").Mesh}
 */
function createFilledPolygon(polygonPoints, colorValue, opacityValue, THREE) {
    let centerPoint = new THREE.Vector3();
    polygonPoints.forEach((polygonPoint) => centerPoint.add(polygonPoint));
    centerPoint.divideScalar(Math.max(1, polygonPoints.length));

    let positions = [];
    for (let pointIndex = 0; pointIndex < polygonPoints.length; pointIndex += 1) {
        let nextIndex = (pointIndex + 1) % polygonPoints.length;
        positions.push(centerPoint.x, centerPoint.y, centerPoint.z);
        positions.push(polygonPoints[pointIndex].x, polygonPoints[pointIndex].y, polygonPoints[pointIndex].z);
        positions.push(polygonPoints[nextIndex].x, polygonPoints[nextIndex].y, polygonPoints[nextIndex].z);
    }

    let geometryObject = new THREE.BufferGeometry();
    geometryObject.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometryObject.computeVertexNormals();

    return new THREE.Mesh(
        geometryObject,
        new THREE.MeshBasicMaterial({
            color: colorValue,
            transparent: true,
            opacity: opacityValue,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
}

/**
 * @param {import("./vendor/three.module.js").Vector3} normalVector
 * @param {number} constantValue
 * @param {Array<import("./vendor/three.module.js").Vector3>} cubeVertices
 * @param {Array<Array<number>>} cubeEdges
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @returns {Array<import("./vendor/three.module.js").Vector3>}
 */
function findCubeSectionPoints(normalVector, constantValue, cubeVertices, cubeEdges, THREE) {
    let pointsArray = [];

    cubeEdges.forEach((edgePair) => {
        let edgeStart = cubeVertices[edgePair[0]];
        let edgeEnd = cubeVertices[edgePair[1]];
        let startValue = normalVector.dot(edgeStart) - constantValue;
        let endValue = normalVector.dot(edgeEnd) - constantValue;

        if (Math.abs(startValue) < 0.0001) {
            pushUnique(pointsArray, edgeStart, THREE);
        }

        if (Math.abs(endValue) < 0.0001) {
            pushUnique(pointsArray, edgeEnd, THREE);
        }

        if (startValue * endValue > 0) {
            return;
        }

        let denominatorValue = endValue - startValue;
        if (Math.abs(denominatorValue) < 0.000001) {
            return;
        }

        let factorValue = -startValue / denominatorValue;
        if (factorValue < 0 || factorValue > 1) {
            return;
        }

        let hitPoint = new THREE.Vector3().lerpVectors(edgeStart, edgeEnd, factorValue);
        pushUnique(pointsArray, hitPoint, THREE);
    });

    if (pointsArray.length < 3) {
        return pointsArray;
    }

    let centerPoint = new THREE.Vector3();
    pointsArray.forEach((pointObject) => centerPoint.add(pointObject));
    centerPoint.divideScalar(pointsArray.length);

    let basisU = new THREE.Vector3(1, -1, 0).normalize();
    if (Math.abs(normalVector.dot(basisU)) > 0.95) {
        basisU = new THREE.Vector3(0, 1, -1).normalize();
    }

    let basisV = new THREE.Vector3().crossVectors(normalVector, basisU).normalize();
    basisU = new THREE.Vector3().crossVectors(basisV, normalVector).normalize();

    pointsArray.sort((firstPoint, secondPoint) => {
        let firstOffset = firstPoint.clone().sub(centerPoint);
        let secondOffset = secondPoint.clone().sub(centerPoint);
        let firstAngle = Math.atan2(firstOffset.dot(basisV), firstOffset.dot(basisU));
        let secondAngle = Math.atan2(secondOffset.dot(basisV), secondOffset.dot(basisU));
        return firstAngle - secondAngle;
    });

    return pointsArray;
}

/**
 * @param {Array<import("./vendor/three.module.js").Vector3>} pointsArray
 * @param {import("./vendor/three.module.js").Vector3} candidatePoint
 * @param {typeof import("./vendor/three.module.js")} THREE
 * @returns {void}
 */
function pushUnique(pointsArray, candidatePoint, THREE) {
    let exists = pointsArray.some((pointObject) => pointObject.distanceToSquared(candidatePoint) < 0.0001);
    if (!exists) {
        pointsArray.push(new THREE.Vector3(candidatePoint.x, candidatePoint.y, candidatePoint.z));
    }
}
