import {dotProduct, subtractVectors} from "./vector.js";

const MIN_CAMERA_DEPTH = 0.01;

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
        depth: cameraDepth,
        screenX: cameraState.frameCenterX + cameraX * focalLength / cameraDepth,
        screenY: cameraState.frameCenterY - cameraY * focalLength / cameraDepth,
    };
}

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

function measureAverageDepth(projectedPoints) {
    if (projectedPoints.length === 0) {
        return 0;
    }

    let depthSum = projectedPoints.reduce((sum, point) => sum + point.depth, 0);
    return depthSum / projectedPoints.length;
}

class SceneRenderer {
    /** @type {CanvasRenderingContext2D} */
    #drawingContext;

    /**
     * @param {CanvasRenderingContext2D} drawingContext
     */
    constructor(drawingContext) {
        this.#drawingContext = drawingContext;
    }

    render(compiledScene, cameraState, viewportSize, pixelRatio) {
        this.#drawingContext.clearRect(0, 0, viewportSize.width, viewportSize.height);
        if (viewportSize.width === 0 || viewportSize.height === 0) {
            return;
        }

        let drawQueues = this.#buildDrawQueues(compiledScene, cameraState, viewportSize);
        this.#drawPlaneItems(drawQueues.planeItems, pixelRatio);
        this.#drawPolylineItems(drawQueues.polylineItems, pixelRatio);
        this.#drawLabelItems(drawQueues.labelItems, pixelRatio);
    }

    #buildDrawQueues(compiledScene, cameraState, viewportSize) {
        let planeItems = this.#projectPlanarItems(compiledScene.planes, cameraState, viewportSize);
        let polylineItems = this.#projectPolylineItems(compiledScene.polylines, cameraState, viewportSize);
        let labelItems = this.#projectLabelItems(compiledScene.labels, cameraState, viewportSize);

        planeItems.sort((leftItem, rightItem) => rightItem.depth - leftItem.depth);
        polylineItems.sort((leftItem, rightItem) => rightItem.depth - leftItem.depth);
        labelItems.sort((leftItem, rightItem) => rightItem.depth - leftItem.depth);

        return {labelItems, planeItems, polylineItems};
    }

    #projectPlanarItems(planeItems, cameraState, viewportSize) {
        return planeItems.flatMap((planeItem) => {
            let points = projectPoints(planeItem.points, cameraState, viewportSize);
            if (points.length < 3) {
                return [];
            }

            return [{...planeItem, depth: measureAverageDepth(points), points}];
        });
    }

    #projectPolylineItems(polylineItems, cameraState, viewportSize) {
        return polylineItems.flatMap((polylineItem) => {
            let points = projectPoints(polylineItem.points, cameraState, viewportSize);
            if (points.length < 2) {
                return [];
            }

            return [{...polylineItem, depth: measureAverageDepth(points), points}];
        });
    }

    #projectLabelItems(labelItems, cameraState, viewportSize) {
        return labelItems.flatMap((labelItem) => {
            let point = projectPoint(labelItem.position, cameraState, viewportSize);
            if (!point) {
                return [];
            }

            return [{...labelItem, depth: point.depth, point}];
        });
    }

    #drawPlaneItems(planeItems, pixelRatio) {
        planeItems.forEach((planeItem) => {
            this.#drawingContext.beginPath();
            this.#tracePath(planeItem.points);
            this.#drawingContext.closePath();
            this.#drawingContext.fillStyle = planeItem.fillStyle;
            this.#drawingContext.fill();
            this.#drawingContext.lineWidth = planeItem.lineWidth * pixelRatio;
            this.#drawingContext.strokeStyle = planeItem.strokeStyle;
            this.#drawingContext.stroke();
        });
    }

    #drawPolylineItems(polylineItems, pixelRatio) {
        this.#drawingContext.lineCap = "round";
        this.#drawingContext.lineJoin = "round";

        polylineItems.forEach((polylineItem) => {
            this.#drawingContext.beginPath();
            this.#tracePath(polylineItem.points);
            this.#drawingContext.lineWidth = polylineItem.lineWidth * pixelRatio;
            this.#drawingContext.strokeStyle = polylineItem.strokeStyle;
            this.#drawingContext.stroke();
        });
    }

    #drawLabelItems(labelItems, pixelRatio) {
        this.#drawingContext.textAlign = "center";
        this.#drawingContext.textBaseline = "middle";

        labelItems.forEach((labelItem) => {
            let fontSize = labelItem.fontSize * pixelRatio;
            this.#drawingContext.font = `600 ${fontSize}px "Trebuchet MS", sans-serif`;
            this.#drawingContext.lineWidth = Math.max(2, fontSize * 0.22);
            this.#drawingContext.strokeStyle = "rgba(255, 255, 255, 0.96)";
            this.#drawingContext.strokeText(labelItem.text, labelItem.point.screenX, labelItem.point.screenY);
            this.#drawingContext.fillStyle = labelItem.fillStyle;
            this.#drawingContext.fillText(labelItem.text, labelItem.point.screenX, labelItem.point.screenY);
        });
    }

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

export {SceneRenderer, projectPoint, projectPoints};
