import {clampNumber} from "../shared/normalize.js";
import {
    WORLD_SIDE_VECTOR,
    WORLD_UP_VECTOR,
    addVectors,
    crossProduct,
    normalizeVector,
    subtractVectors,
    vectorLength,
} from "./vector.js";
import {
    MAX_CAMERA_PITCH,
    MAX_CAMERA_ZOOM,
    MIN_CAMERA_PITCH,
    MIN_CAMERA_ZOOM,
} from "./scene-schema.js";

const DEFAULT_FIELD_OF_VIEW = Math.PI / 3.15;
const DESKTOP_VIEWPORT_MIN_WIDTH = 960;
const DESKTOP_FRAME_WIDTH_RATIO = 2 / 3;
const DESKTOP_FRAME_CENTER_X_RATIO = 2 / 3;

function clampCameraPitch(cameraPitch) {
    return clampNumber(cameraPitch, MIN_CAMERA_PITCH, MAX_CAMERA_PITCH);
}

function clampCameraZoom(cameraZoom) {
    return clampNumber(cameraZoom, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
}

function measureRenderFrame(viewportSize, rootWidth) {
    if (rootWidth >= DESKTOP_VIEWPORT_MIN_WIDTH) {
        return {
            frameCenterX: viewportSize.width * DESKTOP_FRAME_CENTER_X_RATIO,
            frameCenterY: viewportSize.height * 0.5,
            frameWidth: viewportSize.width * DESKTOP_FRAME_WIDTH_RATIO,
        };
    }

    return {
        frameCenterX: viewportSize.width * 0.5,
        frameCenterY: viewportSize.height * 0.5,
        frameWidth: viewportSize.width,
    };
}

function computeFitDistance(sceneRadius, viewportAspect) {
    let horizontalFov = 2 * Math.atan(Math.tan(DEFAULT_FIELD_OF_VIEW / 2) * Math.max(viewportAspect, 0.1));
    let limitingFov = Math.min(DEFAULT_FIELD_OF_VIEW, horizontalFov);
    return (sceneRadius / Math.sin(limitingFov / 2)) * 1.2;
}

function buildCameraState(sceneBounds, camera, viewportSize, rootWidth) {
    let renderFrame = measureRenderFrame(viewportSize, rootWidth);
    let viewportAspect = renderFrame.frameWidth / Math.max(viewportSize.height, 1);
    let distance = computeFitDistance(sceneBounds.radius, viewportAspect) * camera.zoom;
    let horizontalDistance = distance * Math.cos(camera.pitch);
    let cameraOffset = {
        x: Math.sin(camera.yaw) * horizontalDistance,
        y: Math.sin(camera.pitch) * distance,
        z: Math.cos(camera.yaw) * horizontalDistance,
    };

    return buildCameraBasis(sceneBounds.center, cameraOffset, renderFrame);
}

function buildCameraBasis(sceneCenter, cameraOffset, renderFrame) {
    let position = addVectors(sceneCenter, cameraOffset);
    let forwardVector = normalizeVector(subtractVectors(sceneCenter, position));
    let rightVector = normalizeVector(crossProduct(forwardVector, WORLD_UP_VECTOR));

    if (vectorLength(rightVector) <= 0) {
        rightVector = normalizeVector(crossProduct(forwardVector, WORLD_SIDE_VECTOR));
    }

    return {
        fieldOfView: DEFAULT_FIELD_OF_VIEW,
        forwardVector,
        frameCenterX: renderFrame.frameCenterX,
        frameCenterY: renderFrame.frameCenterY,
        position,
        rightVector,
        upVector: normalizeVector(crossProduct(rightVector, forwardVector)),
    };
}

export {buildCameraState, clampCameraPitch, clampCameraZoom};
