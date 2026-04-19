import * as THREE from "./vendor/three.module.js";

const COLOR_PALETTE = Object.freeze({
    white: "#ffffff",
    whiteSoft: "#f5f5f5",
    black: "#111111",
    blackSoft: "#3d3d3d",
    blackMuted: "#6a6a6a",
    red: "#c41c1c",
    redSoft: "#dd6262",
});

const DEFAULT_CARD_SUBTITLE = "";
const DEFAULT_CARD_TITLE = "";
const DEFAULT_CARD_STATEMENT = "";
const DEFAULT_CARD_HINT = "";

const DEFAULT_CAMERA_YAW = 0.92;
const DEFAULT_CAMERA_PITCH = 0.56;
const DEFAULT_CAMERA_ZOOM = 1;
const DEFAULT_FIELD_OF_VIEW = THREE.MathUtils.degToRad(42);

const MIN_DISTANCE_SCALE = 0.52;
const MAX_DISTANCE_SCALE = 2.7;
const MIN_CAMERA_PITCH = -1.24;
const MAX_CAMERA_PITCH = 1.24;
const MIN_SCENE_RADIUS = 1.5;

const POINTER_ROTATION_SPEED = 0.008;
const WHEEL_ZOOM_SPEED = 0.0012;

const EPSILON = 1e-6;

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
 * @returns {THREE.Vector3}
 */
function normalizeVector3(value) {
    if (!Array.isArray(value) || value.length < 3) {
        return new THREE.Vector3();
    }

    return new THREE.Vector3(
        toFiniteNumber(value[0], 0),
        toFiniteNumber(value[1], 0),
        toFiniteNumber(value[2], 0)
    );
}

/**
 * @param {unknown} value
 * @returns {THREE.Vector3[]}
 */
function normalizePointList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    let points = [];
    for (let pointIndex = 0; pointIndex < value.length; pointIndex += 1) {
        points.push(normalizeVector3(value[pointIndex]));
    }

    return points;
}

/**
 * @param {unknown} value
 * @returns {"black" | "red" | "white"}
 */
function normalizeColorName(value) {
    if (value === "red") {
        return "red";
    }

    if (value === "white") {
        return "white";
    }

    return "black";
}

/**
 * @param {unknown} itemDefinition
 * @returns {object | undefined}
 */
function normalizeLegacyItem(itemDefinition) {
    if (!itemDefinition || typeof itemDefinition !== "object") {
        return undefined;
    }

    let itemType = normalizeText(itemDefinition.type);

    if (itemType === "line") {
        let points = normalizePointList(itemDefinition.points);
        if (points.length < 2) {
            return undefined;
        }

        return {
            type: "line",
            color: normalizeColorName(itemDefinition.color),
            opacity: clampNumber(toFiniteNumber(itemDefinition.opacity, 1), 0, 1),
            width: clampNumber(toFiniteNumber(itemDefinition.width, 2), 1, 8),
            points,
        };
    }

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
            outlineWidth: clampNumber(toFiniteNumber(itemDefinition.outlineWidth, 1.4), 1, 6),
            points,
        };
    }

    if (itemType === "right-angle") {
        return {
            type: "right-angle",
            color: normalizeColorName(itemDefinition.color),
            opacity: clampNumber(toFiniteNumber(itemDefinition.opacity, 1), 0, 1),
            width: clampNumber(toFiniteNumber(itemDefinition.width, 1.4), 1, 6),
            origin: normalizeVector3(itemDefinition.origin),
            u: normalizeVector3(itemDefinition.u),
            v: normalizeVector3(itemDefinition.v),
        };
    }

    if (itemType === "label") {
        return {
            type: "label",
            text: normalizeText(itemDefinition.text),
            color: normalizeColorName(itemDefinition.color),
            fontSize: clampNumber(toFiniteNumber(itemDefinition.fontSize, 20), 12, 42),
            position: normalizeVector3(itemDefinition.position),
        };
    }

    return undefined;
}

/**
 * @param {unknown} cardDefinition
 * @returns {{
 *   id: string,
 *   subtitle: string,
 *   title: string,
 *   statement: string,
 *   hint: string,
 *   camera: {yaw: number, pitch: number, zoom: number},
 *   legacyItems: object[],
 * }}
 */
function normalizeCardDefinition(cardDefinition) {
    let legacyItems = [];
    let rawItems = Array.isArray(cardDefinition?.items) ? cardDefinition.items : [];
    for (let itemIndex = 0; itemIndex < rawItems.length; itemIndex += 1) {
        let normalizedItem = normalizeLegacyItem(rawItems[itemIndex]);
        if (normalizedItem) {
            legacyItems.push(normalizedItem);
        }
    }

    return {
        id: normalizeText(cardDefinition?.id),
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
        legacyItems,
    };
}

/**
 * @param {string} id
 * @returns {number}
 */
function parseRuleNumber(id) {
    let match = typeof id === "string" ? id.match(/(\d{1,3})/) : null;
    if (!match) {
        return 0;
    }

    let parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? parsed : 0;
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

    return (sceneRadius / Math.sin(limitingFov / 2)) * 1.28;
}

/**
 * @param {THREE.Object3D} object
 * @returns {void}
 */
function disposeObjectTree(object) {
    object.traverse((node) => {
        if ("geometry" in node && node.geometry instanceof THREE.BufferGeometry) {
            node.geometry.dispose();
        }

        if ("material" in node && node.material) {
            let materials = Array.isArray(node.material) ? node.material : [node.material];
            for (let materialIndex = 0; materialIndex < materials.length; materialIndex += 1) {
                let material = materials[materialIndex];
                if (!material || typeof material !== "object") {
                    continue;
                }

                for (let key of ["map", "alphaMap"]) {
                    if (material[key] && typeof material[key].dispose === "function") {
                        material[key].dispose();
                    }
                }

                if (typeof material.dispose === "function") {
                    material.dispose();
                }
            }
        }
    });
}

/**
 * @param {THREE.Vector3} normal
 * @returns {{u: THREE.Vector3, v: THREE.Vector3, n: THREE.Vector3}}
 */
function createBasisFromNormal(normal) {
    let n = normal.clone();
    if (n.lengthSq() < EPSILON) {
        n.set(0, 1, 0);
    }
    n.normalize();

    let tangent = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    let u = new THREE.Vector3().crossVectors(n, tangent).normalize();
    let v = new THREE.Vector3().crossVectors(n, u).normalize();

    return {u, v, n};
}

class AcademicSceneBuilder {
    /** @type {THREE.Group} */
    #group = new THREE.Group();

    /** @type {THREE.Box3} */
    #bounds = new THREE.Box3();

    /** @type {Map<string, HTMLCanvasElement>} */
    #labelCanvasCache = new Map();

    /** @returns {THREE.Group} */
    get group() {
        return this.#group;
    }

    /**
     * @param {string} colorName
     * @returns {THREE.Color}
     */
    #resolveColor(colorName) {
        switch (colorName) {
            case "red":
                return new THREE.Color(COLOR_PALETTE.red);
            case "white":
                return new THREE.Color(COLOR_PALETTE.white);
            default:
                return new THREE.Color(COLOR_PALETTE.black);
        }
    }

    /**
     * @param {THREE.Object3D} object
     * @returns {void}
     */
    #attach(object) {
        this.#group.add(object);
        let objectBounds = new THREE.Box3().setFromObject(object);
        if (!objectBounds.isEmpty()) {
            this.#bounds.union(objectBounds);
        }
    }

    /**
     * @param {THREE.Vector3} point
     * @returns {void}
     */
    #trackPoint(point) {
        this.#bounds.expandByPoint(point);
    }

    /**
     * @param {THREE.Vector3} position
     * @param {{color?: string, radius?: number, opacity?: number}} options
     * @returns {void}
     */
    addPoint(position, options = {}) {
        let radius = Math.max(toFiniteNumber(options.radius, 0.045), 0.012);
        let geometry = new THREE.SphereGeometry(radius, 18, 12);
        let material = new THREE.MeshStandardMaterial({
            color: this.#resolveColor(options.color || "black"),
            transparent: true,
            opacity: clampNumber(toFiniteNumber(options.opacity, 1), 0, 1),
            roughness: 0.45,
            metalness: 0.04,
        });

        let point = new THREE.Mesh(geometry, material);
        point.position.copy(position);
        this.#attach(point);
    }

    /**
     * @param {THREE.Vector3} startPoint
     * @param {THREE.Vector3} endPoint
     * @param {{color?: string, radius?: number, opacity?: number}} options
     * @returns {void}
     */
    addSegment(startPoint, endPoint, options = {}) {
        let segment = new THREE.Vector3().subVectors(endPoint, startPoint);
        let segmentLength = segment.length();
        if (segmentLength < EPSILON) {
            return;
        }

        let radius = Math.max(toFiniteNumber(options.radius, 0.017), 0.005);
        let geometry = new THREE.CylinderGeometry(radius, radius, segmentLength, 12, 1, true);
        let material = new THREE.MeshStandardMaterial({
            color: this.#resolveColor(options.color || "black"),
            transparent: true,
            opacity: clampNumber(toFiniteNumber(options.opacity, 1), 0, 1),
            roughness: 0.5,
            metalness: 0.02,
        });

        let cylinder = new THREE.Mesh(geometry, material);
        cylinder.position.copy(startPoint).lerp(endPoint, 0.5);
        cylinder.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            segment.clone().normalize()
        );

        this.#attach(cylinder);
    }

    /**
     * @param {THREE.Vector3[]} points
     * @param {{color?: string, radius?: number, opacity?: number, closed?: boolean}} options
     * @returns {void}
     */
    addPolyline(points, options = {}) {
        if (!Array.isArray(points) || points.length < 2) {
            return;
        }

        for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
            this.addSegment(points[pointIndex], points[pointIndex + 1], options);
        }

        if (options.closed) {
            this.addSegment(points[points.length - 1], points[0], options);
        }
    }

    /**
     * @param {THREE.Vector3} startPoint
     * @param {THREE.Vector3} endPoint
     * @param {{color?: string, opacity?: number, dashSize?: number, gapSize?: number}} options
     * @returns {void}
     */
    addDashedSegment(startPoint, endPoint, options = {}) {
        let geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
        let material = new THREE.LineDashedMaterial({
            color: this.#resolveColor(options.color || "black"),
            transparent: true,
            opacity: clampNumber(toFiniteNumber(options.opacity, 0.8), 0, 1),
            dashSize: Math.max(toFiniteNumber(options.dashSize, 0.15), 0.02),
            gapSize: Math.max(toFiniteNumber(options.gapSize, 0.09), 0.02),
        });

        let line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        this.#attach(line);
    }

    /**
     * @param {THREE.Vector3[]} points
     * @param {{color?: string, fillOpacity?: number, outlineColor?: string, outlineRadius?: number, outlineOpacity?: number}} options
     * @returns {void}
     */
    addPolygon(points, options = {}) {
        if (!Array.isArray(points) || points.length < 3) {
            return;
        }

        let positions = [];
        for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
            positions.push(points[pointIndex].x, points[pointIndex].y, points[pointIndex].z);
        }

        let indices = [];
        for (let index = 1; index < points.length - 1; index += 1) {
            indices.push(0, index, index + 1);
        }

        let geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        let material = new THREE.MeshStandardMaterial({
            color: this.#resolveColor(options.color || "white"),
            transparent: true,
            opacity: clampNumber(toFiniteNumber(options.fillOpacity, 0.2), 0, 1),
            side: THREE.DoubleSide,
            roughness: 0.72,
            metalness: 0,
            depthWrite: false,
        });

        let polygon = new THREE.Mesh(geometry, material);
        this.#attach(polygon);

        this.addPolyline(points, {
            color: options.outlineColor || "black",
            radius: toFiniteNumber(options.outlineRadius, 0.011),
            opacity: clampNumber(toFiniteNumber(options.outlineOpacity, 0.84), 0, 1),
            closed: true,
        });
    }

    /**
     * @param {THREE.Vector3} center
     * @param {THREE.Vector3} normal
     * @param {number} radius
     * @param {{color?: string, lineRadius?: number, opacity?: number, segments?: number}} options
     * @returns {void}
     */
    addCircle(center, normal, radius, options = {}) {
        let safeRadius = Math.max(toFiniteNumber(radius, 1), EPSILON);
        let segmentCount = Math.max(Math.floor(toFiniteNumber(options.segments, 72)), 16);
        let basis = createBasisFromNormal(normal);
        let points = [];

        for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
            let angle = (segmentIndex / segmentCount) * Math.PI * 2;
            let point = center
                .clone()
                .addScaledVector(basis.u, Math.cos(angle) * safeRadius)
                .addScaledVector(basis.v, Math.sin(angle) * safeRadius);
            points.push(point);
        }

        this.addPolyline(points, {
            color: options.color || "black",
            radius: toFiniteNumber(options.lineRadius, 0.012),
            opacity: clampNumber(toFiniteNumber(options.opacity, 0.9), 0, 1),
            closed: true,
        });
    }

    /**
     * @param {THREE.Vector3} center
     * @param {THREE.Vector3} uAxis
     * @param {THREE.Vector3} vAxis
     * @param {number} radius
     * @param {number} startAngle
     * @param {number} endAngle
     * @param {{color?: string, lineRadius?: number, opacity?: number, segments?: number}} options
     * @returns {void}
     */
    addArc(center, uAxis, vAxis, radius, startAngle, endAngle, options = {}) {
        let segmentCount = Math.max(Math.floor(toFiniteNumber(options.segments, 32)), 12);
        let points = [];

        for (let segmentIndex = 0; segmentIndex <= segmentCount; segmentIndex += 1) {
            let alpha = segmentIndex / segmentCount;
            let angle = startAngle + (endAngle - startAngle) * alpha;
            let point = center
                .clone()
                .addScaledVector(uAxis, Math.cos(angle) * radius)
                .addScaledVector(vAxis, Math.sin(angle) * radius);
            points.push(point);
        }

        this.addPolyline(points, {
            color: options.color || "red",
            radius: toFiniteNumber(options.lineRadius, 0.011),
            opacity: clampNumber(toFiniteNumber(options.opacity, 0.95), 0, 1),
        });
    }

    /**
     * @param {THREE.Vector3} origin
     * @param {THREE.Vector3} direction
     * @param {number} length
     * @param {{color?: string, opacity?: number, headLength?: number, headWidth?: number}} options
     * @returns {void}
     */
    addArrow(origin, direction, length, options = {}) {
        let safeLength = Math.max(toFiniteNumber(length, 1), EPSILON);
        let vector = direction.clone();
        if (vector.lengthSq() < EPSILON) {
            vector.set(1, 0, 0);
        }

        vector.normalize();
        let arrow = new THREE.ArrowHelper(
            vector,
            origin,
            safeLength,
            this.#resolveColor(options.color || "red").getHex(),
            Math.max(toFiniteNumber(options.headLength, safeLength * 0.16), 0.05),
            Math.max(toFiniteNumber(options.headWidth, safeLength * 0.09), 0.03)
        );

        let opacity = clampNumber(toFiniteNumber(options.opacity, 0.96), 0, 1);
        arrow.line.material.transparent = true;
        arrow.line.material.opacity = opacity;
        arrow.cone.material.transparent = true;
        arrow.cone.material.opacity = opacity;

        this.#attach(arrow);
    }

    /**
     * @param {THREE.BufferGeometry} geometry
     * @param {{
     *   color?: string,
     *   opacity?: number,
     *   wireColor?: string,
     *   wireOpacity?: number,
     *   position?: THREE.Vector3,
     *   rotation?: THREE.Euler,
     *   scale?: THREE.Vector3,
     * }} options
     * @returns {void}
     */
    addSolidWithWire(geometry, options = {}) {
        let mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
                color: this.#resolveColor(options.color || "white"),
                transparent: true,
                opacity: clampNumber(toFiniteNumber(options.opacity, 0.2), 0, 1),
                side: THREE.DoubleSide,
                roughness: 0.58,
                metalness: 0.04,
                depthWrite: false,
            })
        );

        if (options.position instanceof THREE.Vector3) {
            mesh.position.copy(options.position);
        }

        if (options.rotation instanceof THREE.Euler) {
            mesh.rotation.copy(options.rotation);
        }

        if (options.scale instanceof THREE.Vector3) {
            mesh.scale.copy(options.scale);
        }

        this.#attach(mesh);

        let wire = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({
                color: this.#resolveColor(options.wireColor || "black"),
                transparent: true,
                opacity: clampNumber(toFiniteNumber(options.wireOpacity, 0.95), 0, 1),
            })
        );

        wire.position.copy(mesh.position);
        wire.rotation.copy(mesh.rotation);
        wire.scale.copy(mesh.scale);

        this.#attach(wire);
    }

    /**
     * @param {THREE.Vector3} origin
     * @param {THREE.Vector3} uVector
     * @param {THREE.Vector3} vVector
     * @param {number} size
     * @param {{color?: string, opacity?: number, radius?: number}} options
     * @returns {void}
     */
    addRightAngleMarker(origin, uVector, vVector, size = 0.24, options = {}) {
        let u = uVector.clone();
        let v = vVector.clone();
        if (u.lengthSq() < EPSILON || v.lengthSq() < EPSILON) {
            return;
        }

        u.normalize().multiplyScalar(size);
        v.normalize().multiplyScalar(size);

        let firstPoint = origin.clone().add(u);
        let secondPoint = firstPoint.clone().add(v);
        let thirdPoint = origin.clone().add(v);

        this.addPolyline([firstPoint, secondPoint, thirdPoint], {
            color: options.color || "black",
            opacity: clampNumber(toFiniteNumber(options.opacity, 0.95), 0, 1),
            radius: toFiniteNumber(options.radius, 0.009),
        });
    }

    /**
     * @param {string} text
     * @param {THREE.Vector3} position
     * @param {{color?: string, size?: number}} options
     * @returns {void}
     */
    addLabel(text, position, options = {}) {
        let labelText = normalizeText(text);
        if (labelText.length === 0) {
            return;
        }

        let color = options.color || "black";
        let cacheKey = `${labelText}::${color}`;
        let labelCanvas = this.#labelCanvasCache.get(cacheKey);

        if (!labelCanvas) {
            labelCanvas = document.createElement("canvas");
            labelCanvas.width = 256;
            labelCanvas.height = 96;

            let context = labelCanvas.getContext("2d");
            if (!context) {
                return;
            }

            context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
            context.fillStyle = "rgba(255, 255, 255, 0.94)";
            context.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
            context.strokeStyle = "rgba(17, 17, 17, 0.22)";
            context.lineWidth = 3;
            context.strokeRect(1.5, 1.5, labelCanvas.width - 3, labelCanvas.height - 3);

            context.font = "700 54px Trebuchet MS, sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";

            context.strokeStyle = "rgba(255, 255, 255, 0.95)";
            context.lineWidth = 8;
            context.strokeText(labelText, labelCanvas.width / 2, labelCanvas.height / 2 + 2);

            context.fillStyle = this.#resolveColor(color).getStyle();
            context.fillText(labelText, labelCanvas.width / 2, labelCanvas.height / 2 + 2);

            this.#labelCanvasCache.set(cacheKey, labelCanvas);
        }

        let texture = new THREE.CanvasTexture(labelCanvas);
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;

        let sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthWrite: false,
            })
        );

        let size = Math.max(toFiniteNumber(options.size, 0.34), 0.12);
        sprite.scale.set(size * 2.6, size, 1);
        sprite.position.copy(position);

        this.#attach(sprite);
        this.#trackPoint(position);
    }

    /**
     * @param {number} size
     * @returns {void}
     */
    addCoordinateAxes(size = 1.8) {
        let axisSize = Math.max(toFiniteNumber(size, 1.8), 0.5);
        this.addArrow(new THREE.Vector3(), new THREE.Vector3(1, 0, 0), axisSize, {color: "black"});
        this.addArrow(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), axisSize, {color: "red"});
        this.addArrow(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), axisSize, {color: "black"});

        this.addLabel("x", new THREE.Vector3(axisSize + 0.12, 0.02, 0), {color: "black", size: 0.24});
        this.addLabel("y", new THREE.Vector3(0, axisSize + 0.14, 0), {color: "red", size: 0.24});
        this.addLabel("z", new THREE.Vector3(0, 0.05, axisSize + 0.16), {color: "black", size: 0.24});
    }

    /**
     * @returns {{group: THREE.Group, center: THREE.Vector3, radius: number}}
     */
    finish() {
        if (this.#bounds.isEmpty()) {
            this.#bounds.expandByPoint(new THREE.Vector3(-1, -1, -1));
            this.#bounds.expandByPoint(new THREE.Vector3(1, 1, 1));
        }

        let sphere = this.#bounds.getBoundingSphere(new THREE.Sphere());
        return {
            group: this.#group,
            center: sphere.center.clone(),
            radius: Math.max(sphere.radius, MIN_SCENE_RADIUS),
        };
    }
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {THREE.Vector3}
 */
function v3(x, y, z) {
    return new THREE.Vector3(x, y, z);
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {number} ruleNumber
 * @returns {void}
 */
function buildIncidenceScene(builder, ruleNumber) {
    const planeCorners = [v3(-2, 0, -2), v3(2, 0, -2), v3(2, 0, 2), v3(-2, 0, 2)];

    switch (ruleNumber) {
        case 1: {
            const pointA = v3(-1.1, 0, -0.7);
            const pointB = v3(1.2, 0, -0.2);
            const pointC = v3(-0.25, 0, 1.1);

            builder.addPolygon(planeCorners, {
                color: "white",
                fillOpacity: 0.24,
                outlineColor: "black",
                outlineOpacity: 0.62,
            });
            builder.addPolyline([pointA, pointB, pointC], {
                color: "red",
                opacity: 0.95,
                radius: 0.015,
                closed: true,
            });
            builder.addPoint(pointA, {color: "black"});
            builder.addPoint(pointB, {color: "black"});
            builder.addPoint(pointC, {color: "black"});

            builder.addLabel("A", pointA.clone().add(v3(-0.08, 0.11, -0.08)));
            builder.addLabel("B", pointB.clone().add(v3(0.09, 0.11, -0.05)));
            builder.addLabel("C", pointC.clone().add(v3(0.02, 0.11, 0.08)));
            break;
        }

        case 2: {
            const lineA = v3(-1.4, 0, -0.65);
            const lineB = v3(1.25, 0, 0.5);
            const lineC = v3(-0.15, 0, -0.02);

            builder.addPolygon(planeCorners, {
                color: "white",
                fillOpacity: 0.2,
                outlineColor: "black",
                outlineOpacity: 0.62,
            });
            builder.addSegment(lineA, lineB, {color: "black", radius: 0.018});
            builder.addPoint(lineA, {color: "black"});
            builder.addPoint(lineB, {color: "black"});
            builder.addPoint(lineC, {color: "red", radius: 0.055});
            builder.addLabel("M", lineC.clone().add(v3(0.03, 0.12, 0.03)), {color: "red"});
            break;
        }

        case 3: {
            const secondPlane = [v3(-0.5, -1.6, -2), v3(0.5, -1.6, -2), v3(0.5, 1.6, 2), v3(-0.5, 1.6, 2)];

            builder.addPolygon(planeCorners, {
                color: "white",
                fillOpacity: 0.22,
                outlineColor: "black",
                outlineOpacity: 0.58,
            });
            builder.addPolygon(secondPlane, {
                color: "white",
                fillOpacity: 0.14,
                outlineColor: "red",
                outlineOpacity: 0.78,
            });
            builder.addSegment(v3(0, 0, -2), v3(0, 0, 2), {color: "red", radius: 0.02});
            break;
        }

        case 4: {
            const lineA = v3(-1.5, 0, -0.8);
            const lineB = v3(1.5, 0, 0.85);
            const pointP = v3(-0.25, 1.2, -0.2);
            const pointQ = pointP.clone().add(lineB.clone().sub(lineA).normalize().multiplyScalar(2.2));

            builder.addPolygon([lineA, lineB, pointQ, pointP], {
                color: "white",
                fillOpacity: 0.2,
                outlineColor: "black",
                outlineOpacity: 0.68,
            });
            builder.addSegment(lineA, lineB, {color: "black", radius: 0.018});
            builder.addPoint(pointP, {color: "red", radius: 0.055});
            break;
        }

        case 5: {
            const o = v3(0, 0, 0);
            const l1a = v3(-1.55, 0, -0.3);
            const l1b = v3(1.6, 0, 0.35);
            const l2a = v3(-0.25, 0, 1.35);
            const l2b = v3(0.35, 0, -1.5);

            builder.addPolygon(planeCorners, {
                color: "white",
                fillOpacity: 0.2,
                outlineColor: "black",
                outlineOpacity: 0.58,
            });
            builder.addSegment(l1a, l1b, {color: "black", radius: 0.016});
            builder.addSegment(l2a, l2b, {color: "red", radius: 0.016});
            builder.addPoint(o, {color: "red", radius: 0.05});
            break;
        }

        case 6: {
            const a = v3(-1.2, -0.7, -0.7);
            const b = v3(1.3, -0.7, -0.35);
            const c = v3(0.1, -0.7, 1.15);
            const d = v3(-0.2, 1.05, 0.12);

            builder.addPolyline([a, b, c], {color: "black", closed: true});
            builder.addSegment(a, d, {color: "black"});
            builder.addSegment(b, d, {color: "black"});
            builder.addSegment(c, d, {color: "red", radius: 0.018});
            builder.addPoint(d, {color: "red", radius: 0.055});
            break;
        }

        case 7: {
            const lineStart = v3(-0.9, 1.2, -1.1);
            const lineEnd = v3(0.9, -1.1, 1.25);
            const intersection = v3(0, 0, 0);

            builder.addPolygon(planeCorners, {
                color: "white",
                fillOpacity: 0.2,
                outlineColor: "black",
                outlineOpacity: 0.56,
            });
            builder.addSegment(lineStart, lineEnd, {color: "black", radius: 0.016});
            builder.addPoint(intersection, {color: "red", radius: 0.055});
            break;
        }

        case 8: {
            const lineA = v3(0, -1.3, 0);
            const lineB = v3(0, 1.3, 0);

            builder.addSegment(lineA, lineB, {color: "red", radius: 0.02});
            builder.addPolygon([v3(-1.6, -0.5, -1.6), v3(1.6, 0.5, -1.6), v3(1.6, 0.5, 1.6), v3(-1.6, -0.5, 1.6)], {
                color: "white",
                fillOpacity: 0.14,
                outlineColor: "black",
                outlineOpacity: 0.45,
            });
            builder.addPolygon([v3(-1.6, -1.1, -1), v3(1.6, 1.1, -1), v3(1.6, 1.1, 1), v3(-1.6, -1.1, 1)], {
                color: "white",
                fillOpacity: 0.1,
                outlineColor: "black",
                outlineOpacity: 0.4,
            });
            builder.addPolygon([v3(-1, -1.2, -1.6), v3(1, 1.2, -1.6), v3(1, 1.2, 1.6), v3(-1, -1.2, 1.6)], {
                color: "white",
                fillOpacity: 0.1,
                outlineColor: "black",
                outlineOpacity: 0.38,
            });
            break;
        }

        case 9: {
            const a = v3(-1.5, 0, 0);
            const b = v3(1.5, 0, 0);
            const m = v3(0, 0, 0);
            const n = v3(-0.65, 0, 0);

            builder.addSegment(a, b, {color: "black", radius: 0.018});
            builder.addPoint(a, {color: "black"});
            builder.addPoint(b, {color: "black"});
            builder.addPoint(m, {color: "red", radius: 0.052});
            builder.addPoint(n, {color: "red", radius: 0.05});
            break;
        }

        case 10:
        default: {
            const lineStart = v3(-1.15, 1.2, -1.05);
            const lineEnd = v3(1.05, -1.2, 1.1);
            const pointI = v3(0, 0, 0);

            builder.addPolygon(planeCorners, {
                color: "white",
                fillOpacity: 0.2,
                outlineColor: "black",
                outlineOpacity: 0.58,
            });
            builder.addSegment(lineStart, lineEnd, {color: "black", radius: 0.017});
            builder.addPoint(pointI, {color: "red", radius: 0.056});
            builder.addLabel("P", pointI.clone().add(v3(0.08, 0.12, 0.08)), {color: "red", size: 0.24});
            break;
        }
    }
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {number} ruleNumber
 * @returns {void}
 */
function buildParallelScene(builder, ruleNumber) {
    const planeLow = [v3(-2, -0.65, -2), v3(2, -0.65, -2), v3(2, -0.65, 2), v3(-2, -0.65, 2)];
    const planeTop = [v3(-2, 0.75, -2), v3(2, 0.75, -2), v3(2, 0.75, 2), v3(-2, 0.75, 2)];

    switch (ruleNumber) {
        case 11: {
            builder.addPolygon([v3(-2, 0, -1.6), v3(2, 0, -1.6), v3(2, 0, 1.6), v3(-2, 0, 1.6)], {
                color: "white",
                fillOpacity: 0.2,
                outlineOpacity: 0.54,
            });
            builder.addSegment(v3(-1.6, 0, -0.7), v3(1.65, 0, -0.2), {color: "black"});
            builder.addSegment(v3(-1.4, 0, 0.8), v3(1.8, 0, 1.3), {color: "red", radius: 0.018});
            break;
        }

        case 12: {
            const pointP = v3(-1.1, 0.45, 1.15);
            builder.addSegment(v3(-1.6, 0, -0.45), v3(1.6, 0, 0.12), {color: "black"});
            builder.addPoint(pointP, {color: "red", radius: 0.05});
            builder.addSegment(pointP.clone().add(v3(-0.7, -0.2, -0.1)), pointP.clone().add(v3(1.2, 0.2, 0.24)), {
                color: "red",
                radius: 0.018,
            });
            break;
        }

        case 13: {
            builder.addSegment(v3(-1.8, -0.3, -0.7), v3(1.8, -0.3, -0.1), {color: "black"});
            builder.addSegment(v3(-1.8, 0.4, 0.8), v3(1.8, 0.4, 1.4), {color: "black"});
            builder.addPolygon([v3(-0.25, -1.1, -1.8), v3(0.25, -1.1, -1.8), v3(0.25, 1.2, 1.8), v3(-0.25, 1.2, 1.8)], {
                color: "white",
                fillOpacity: 0.14,
                outlineColor: "red",
                outlineOpacity: 0.76,
            });
            builder.addPoint(v3(0, -0.3, -0.4), {color: "red"});
            builder.addPoint(v3(0, 0.4, 1.1), {color: "red"});
            break;
        }

        case 14: {
            builder.addSegment(v3(-1.8, -0.4, -0.9), v3(1.8, -0.15, -0.4), {color: "black"});
            builder.addSegment(v3(-1.8, 0.2, 0), v3(1.8, 0.45, 0.5), {color: "red"});
            builder.addSegment(v3(-1.8, 0.8, 0.95), v3(1.8, 1.05, 1.45), {color: "black"});
            break;
        }

        case 15: {
            builder.addPolygon([v3(-2, 0, -2), v3(2, 0, -2), v3(2, 0, 2), v3(-2, 0, 2)], {
                color: "white",
                fillOpacity: 0.2,
                outlineOpacity: 0.56,
            });
            builder.addSegment(v3(-1.55, 0.85, -0.5), v3(1.55, 0.85, 0.25), {color: "red", radius: 0.018});
            builder.addDashedSegment(v3(-1.35, 0.85, -0.5), v3(-1.35, 0, -0.5), {color: "black", opacity: 0.55});
            break;
        }

        case 16: {
            builder.addPolygon([v3(-2, 0, -2), v3(2, 0, -2), v3(2, 0, 2), v3(-2, 0, 2)], {
                color: "white",
                fillOpacity: 0.2,
                outlineOpacity: 0.58,
            });
            builder.addSegment(v3(-1.6, 0, -0.2), v3(1.6, 0, 0.45), {color: "black"});
            builder.addSegment(v3(-1.2, 1, -0.62), v3(1.25, 1, -0.15), {color: "red"});
            builder.addDashedSegment(v3(-1.2, 1, -0.62), v3(-1.2, 0, -0.62), {color: "black", opacity: 0.5});
            break;
        }

        case 17:
        case 18:
        case 20:
        case 22: {
            builder.addPolygon(planeLow, {
                color: "white",
                fillOpacity: 0.2,
                outlineColor: "black",
                outlineOpacity: 0.5,
            });
            builder.addPolygon(planeTop, {
                color: "white",
                fillOpacity: 0.14,
                outlineColor: "black",
                outlineOpacity: 0.46,
            });

            if (ruleNumber === 22) {
                const planeMid = [v3(-2, 0.05, -2), v3(2, 0.05, -2), v3(2, 0.05, 2), v3(-2, 0.05, 2)];
                builder.addPolygon(planeMid, {
                    color: "white",
                    fillOpacity: 0.12,
                    outlineColor: "red",
                    outlineOpacity: 0.62,
                });
            }

            builder.addPolygon([v3(-0.32, -1.4, -2), v3(0.32, -1.4, -2), v3(0.32, 1.4, 2), v3(-0.32, 1.4, 2)], {
                color: "white",
                fillOpacity: 0.11,
                outlineColor: ruleNumber === 18 ? "black" : "red",
                outlineOpacity: 0.72,
            });

            builder.addSegment(v3(-0.32, -0.65, -1.45), v3(0.32, -0.65, 1.45), {color: "red", radius: 0.017});
            builder.addSegment(v3(-0.32, 0.75, -1.45), v3(0.32, 0.75, 1.45), {
                color: ruleNumber === 18 ? "black" : "red",
                radius: 0.017,
            });
            break;
        }

        case 19: {
            const alpha = [v3(-1.9, -0.45, -1.2), v3(1.9, -0.45, -1.2), v3(1.9, 0.4, 1.2), v3(-1.9, 0.4, 1.2)];
            const beta = [v3(-1.5, 0.65, -1.5), v3(1.5, 0.65, -1.5), v3(1.5, 1.5, 1.5), v3(-1.5, 1.5, 1.5)];

            builder.addPolygon(alpha, {
                color: "white",
                fillOpacity: 0.16,
                outlineOpacity: 0.52,
            });
            builder.addPolygon(beta, {
                color: "white",
                fillOpacity: 0.12,
                outlineColor: "red",
                outlineOpacity: 0.68,
            });

            builder.addSegment(v3(-1.3, -0.25, -0.8), v3(1.3, 0.1, 0.7), {color: "black"});
            builder.addSegment(v3(-0.4, -0.35, 0.9), v3(0.4, 0.25, -0.9), {color: "black"});

            builder.addSegment(v3(-1.05, 0.84, -1.05), v3(1.05, 1.21, 0.95), {color: "red"});
            builder.addSegment(v3(-0.3, 0.7, 1.05), v3(0.3, 1.35, -0.95), {color: "red"});
            break;
        }

        case 21:
        default: {
            builder.addPolygon(planeLow, {
                color: "white",
                fillOpacity: 0.2,
                outlineColor: "black",
                outlineOpacity: 0.5,
            });
            builder.addPolygon(planeTop, {
                color: "white",
                fillOpacity: 0.14,
                outlineColor: "black",
                outlineOpacity: 0.46,
            });

            const lineA1 = v3(-1.2, -0.65, -0.8);
            const lineA2 = v3(-0.85, 0.75, -0.3);
            const lineB1 = v3(0.75, -0.65, 0.9);
            const lineB2 = v3(1.1, 0.75, 1.4);

            builder.addSegment(lineA1, lineA2, {color: "red", radius: 0.018});
            builder.addSegment(lineB1, lineB2, {color: "red", radius: 0.018});
            builder.addSegment(lineA1, lineB1, {color: "black", radius: 0.012, opacity: 0.72});
            builder.addSegment(lineA2, lineB2, {color: "black", radius: 0.012, opacity: 0.72});
            break;
        }
    }
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {number} ruleNumber
 * @returns {void}
 */
function buildPerpendicularScene(builder, ruleNumber) {
    const plane = [v3(-2, 0, -2), v3(2, 0, -2), v3(2, 0, 2), v3(-2, 0, 2)];
    const up = new THREE.Vector3(0, 1, 0);

    switch (ruleNumber) {
        case 23: {
            builder.addSegment(v3(-1.55, 0, 0), v3(1.55, 0, 0), {color: "black"});
            builder.addSegment(v3(0, -1.45, 0), v3(0, 1.45, 0), {color: "red"});
            builder.addRightAngleMarker(v3(0, 0, 0), v3(1, 0, 0), v3(0, 1, 0), 0.3);
            break;
        }

        case 24: {
            builder.addSegment(v3(-1.7, -0.65, -0.4), v3(1.7, -0.65, 0.2), {color: "black"});
            builder.addSegment(v3(-1.7, 0.55, -0.4), v3(1.7, 0.55, 0.2), {color: "black"});
            builder.addSegment(v3(0.2, -1.25, -0.08), v3(0.2, 1.15, -0.08), {color: "red"});
            builder.addRightAngleMarker(v3(0.2, -0.65, -0.08), v3(1, 0.18, 0), v3(0, 1, 0), 0.24);
            builder.addRightAngleMarker(v3(0.2, 0.55, -0.08), v3(1, 0.18, 0), v3(0, 1, 0), 0.24);
            break;
        }

        case 25:
        case 26:
        case 29: {
            builder.addPolygon(plane, {
                color: "white",
                fillOpacity: 0.2,
                outlineOpacity: 0.56,
            });
            builder.addSegment(v3(0, -1.4, 0), v3(0, 1.65, 0), {color: "red", radius: 0.018});

            let lineU = v3(1.6, 0, 0.15);
            let lineV = v3(0.25, 0, 1.45);
            builder.addSegment(lineU.clone().multiplyScalar(-1), lineU, {color: "black"});

            if (ruleNumber !== 26) {
                builder.addSegment(lineV.clone().multiplyScalar(-1), lineV, {color: "black"});
                builder.addRightAngleMarker(v3(0, 0, 0), lineU, up, 0.24);
                builder.addRightAngleMarker(v3(0, 0, 0), lineV, up, 0.24);
            }

            if (ruleNumber === 26) {
                builder.addPoint(v3(0, 0, 0), {color: "red", radius: 0.056});
            }
            break;
        }

        case 27:
        case 28: {
            builder.addPolygon(plane, {
                color: "white",
                fillOpacity: 0.22,
                outlineOpacity: 0.58,
            });
            builder.addSegment(v3(-0.8, -1.25, -0.2), v3(-0.8, 1.45, -0.2), {color: "black"});
            builder.addSegment(v3(0.85, -1.25, 0.32), v3(0.85, 1.45, 0.32), {color: "red"});
            builder.addRightAngleMarker(v3(-0.8, 0, -0.2), v3(1, 0, 0), up, 0.24);
            builder.addRightAngleMarker(v3(0.85, 0, 0.32), v3(1, 0, 0), up, 0.24);
            break;
        }

        case 30:
        case 31: {
            const pointA = v3(-0.85, 1.3, -0.2);
            const pointH = v3(-0.85, 0, -0.2);
            const pointB = v3(0.95, 0, 0.8);

            builder.addPolygon(plane, {
                color: "white",
                fillOpacity: 0.2,
                outlineOpacity: 0.58,
            });
            builder.addSegment(v3(-1.5, 0, 1.25), v3(1.5, 0, 0.3), {color: "black"});
            builder.addSegment(pointA, pointH, {color: "black"});
            builder.addSegment(pointA, pointB, {color: "red", radius: 0.018});
            builder.addSegment(pointH, pointB, {color: "black", opacity: 0.8});
            builder.addRightAngleMarker(pointH, v3(1, 0, 0), up, 0.22);
            builder.addRightAngleMarker(pointB, v3(1.5, 0, -0.95), pointA.clone().sub(pointB), 0.18, {
                color: "red",
            });
            break;
        }

        case 32:
        default: {
            const pointP = v3(0, 1.45, 0.25);
            const pointH = v3(0, 0, 0.25);
            const pointQ = v3(1.15, 0, -0.95);

            builder.addPolygon(plane, {
                color: "white",
                fillOpacity: 0.2,
                outlineOpacity: 0.56,
            });
            builder.addSegment(pointP, pointH, {color: "red", radius: 0.018});
            builder.addSegment(pointP, pointQ, {color: "black", radius: 0.014, opacity: 0.86});
            builder.addRightAngleMarker(pointH, v3(1, 0, 0), up, 0.24);
            break;
        }
    }
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {number} ruleNumber
 * @returns {void}
 */
function buildAnglesAndSkewScene(builder, ruleNumber) {
    switch (ruleNumber) {
        case 33:
        case 34: {
            builder.addSegment(v3(-1.6, -0.2, -0.6), v3(1.45, 0.2, -0.1), {color: "black"});
            builder.addSegment(v3(0.7, -1.1, 1.2), v3(0.35, 1.2, -1.15), {color: "red"});

            if (ruleNumber === 34) {
                builder.addPolygon([v3(-2, -0.45, -1.3), v3(2, -0.15, -1.3), v3(2, 0.3, 0.9), v3(-2, 0, 0.9)], {
                    color: "white",
                    fillOpacity: 0.13,
                    outlineOpacity: 0.4,
                });
            }
            break;
        }

        case 35: {
            builder.addSegment(v3(-1.55, -0.3, -0.8), v3(1.4, 0.2, -0.3), {color: "black"});
            builder.addSegment(v3(0.8, -1.2, 1.1), v3(0.35, 1.25, -1.05), {color: "red"});
            builder.addPolygon([v3(-1.6, -0.6, -1.4), v3(1.6, -0.1, -1.4), v3(1.6, 1.15, 1.3), v3(-1.6, 0.65, 1.3)], {
                color: "white",
                fillOpacity: 0.12,
                outlineColor: "black",
                outlineOpacity: 0.48,
            });
            builder.addSegment(v3(-1.4, 0.35, 0.6), v3(1.35, 0.8, 1.05), {color: "red", radius: 0.016});
            break;
        }

        case 36: {
            builder.addArrow(v3(-1.2, -0.4, -0.3), v3(1, 0.25, 0.3), 1.7, {color: "black"});
            builder.addArrow(v3(-1.45, 0.55, 0.5), v3(1, 0.25, 0.3), 1.9, {color: "red"});
            break;
        }

        case 37: {
            const origin1 = v3(-0.85, 0, -0.55);
            const origin2 = v3(0.7, 0.4, 0.8);
            const u = v3(1, 0.2, 0.1).normalize();
            const w = v3(0.2, 0.1, 1).normalize();

            builder.addArrow(origin1, u, 1.45, {color: "black"});
            builder.addArrow(origin1, w, 1.2, {color: "black"});
            builder.addArrow(origin2, u, 1.4, {color: "red"});
            builder.addArrow(origin2, w, 1.15, {color: "red"});

            builder.addArc(origin1, u, w, 0.42, 0.06, 1.02, {color: "black"});
            builder.addArc(origin2, u, w, 0.42, 0.06, 1.02, {color: "red"});
            break;
        }

        case 38:
        case 39:
        case 40: {
            if (ruleNumber === 40) {
                builder.addPolygon([v3(-2, 0, -2), v3(2, 0, -2), v3(2, 0, 2), v3(-2, 0, 2)], {
                    color: "white",
                    fillOpacity: 0.2,
                    outlineOpacity: 0.58,
                });
            }

            const origin = v3(-0.6, 0, -0.5);
            const firstDirection = v3(1.4, 0.25, 0.1);
            const secondDirection = ruleNumber === 39 ? v3(0.55, 0.95, 0.25) : v3(0.65, 0.8, 0.6);

            builder.addArrow(origin, firstDirection, 2.0, {color: "black"});

            if (ruleNumber === 40) {
                builder.addArrow(origin, secondDirection, 1.9, {color: "red"});
                builder.addArrow(origin, v3(secondDirection.x, 0, secondDirection.z), 1.6, {color: "black", opacity: 0.7});
                builder.addArc(origin, firstDirection.clone().normalize(), secondDirection.clone().normalize(), 0.5, 0.05, 0.75, {
                    color: "red",
                });
            } else {
                builder.addArrow(origin, secondDirection, 1.85, {color: "red"});
                builder.addArc(origin, firstDirection.clone().normalize(), secondDirection.clone().normalize(), 0.5, 0.06, 1.03, {
                    color: "red",
                });
            }
            break;
        }

        case 41:
        default: {
            const edgeA = v3(0, -1.4, 0);
            const edgeB = v3(0, 1.4, 0);

            builder.addPolygon([v3(0, -1.4, 0), v3(0, 1.4, 0), v3(1.6, 1.1, 1.2), v3(1.6, -1.1, 1.2)], {
                color: "white",
                fillOpacity: 0.18,
                outlineColor: "black",
                outlineOpacity: 0.58,
            });
            builder.addPolygon([v3(0, -1.4, 0), v3(0, 1.4, 0), v3(-1.5, 1.2, 1.25), v3(-1.5, -1.2, 1.25)], {
                color: "white",
                fillOpacity: 0.12,
                outlineColor: "red",
                outlineOpacity: 0.68,
            });

            builder.addSegment(edgeA, edgeB, {color: "black", radius: 0.02});
            builder.addSegment(v3(0, 0, 0), v3(1.05, 0, 0.78), {color: "black"});
            builder.addSegment(v3(0, 0, 0), v3(-1.0, 0, 0.82), {color: "red"});
            builder.addArc(v3(0, 0, 0), v3(1, 0, 0.74).normalize(), v3(-1, 0, 0.82).normalize(), 0.38, 0, 1.03, {
                color: "red",
            });
            break;
        }
    }
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {THREE.Vector3[]} vertices
 * @param {Array<[number, number]>} edges
 * @param {{color?: string, radius?: number, opacity?: number}} options
 * @returns {void}
 */
function addEdgeSet(builder, vertices, edges, options = {}) {
    for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
        let edge = edges[edgeIndex];
        builder.addSegment(vertices[edge[0]], vertices[edge[1]], options);
    }
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {number} ruleNumber
 * @returns {void}
 */
function buildPolyhedraScene(builder, ruleNumber) {
    const tetraVertices = [
        v3(-1.1, -0.75, -0.8),
        v3(1.2, -0.75, -0.35),
        v3(0.05, -0.75, 1.05),
        v3(-0.2, 1.0, 0.1),
    ];

    const tetraEdges = [
        [0, 1], [1, 2], [2, 0],
        [0, 3], [1, 3], [2, 3],
    ];

    switch (ruleNumber) {
        case 42: {
            addEdgeSet(builder, tetraVertices, tetraEdges, {color: "black", radius: 0.016});
            builder.addPolygon([tetraVertices[0], tetraVertices[1], tetraVertices[2]], {
                color: "white",
                fillOpacity: 0.12,
                outlineOpacity: 0.4,
            });
            break;
        }

        case 43: {
            addEdgeSet(builder, tetraVertices, tetraEdges, {color: "black", radius: 0.014});
            builder.addSegment(tetraVertices[0], tetraVertices[1], {color: "red", radius: 0.019});
            builder.addSegment(tetraVertices[2], tetraVertices[3], {color: "red", radius: 0.019});
            break;
        }

        case 44: {
            addEdgeSet(builder, tetraVertices, tetraEdges, {color: "black", radius: 0.014});

            const centroid0 = tetraVertices[1].clone().add(tetraVertices[2]).add(tetraVertices[3]).multiplyScalar(1 / 3);
            const centroid1 = tetraVertices[0].clone().add(tetraVertices[2]).add(tetraVertices[3]).multiplyScalar(1 / 3);
            const centroid2 = tetraVertices[0].clone().add(tetraVertices[1]).add(tetraVertices[3]).multiplyScalar(1 / 3);
            const centroid3 = tetraVertices[0].clone().add(tetraVertices[1]).add(tetraVertices[2]).multiplyScalar(1 / 3);

            builder.addSegment(tetraVertices[0], centroid0, {color: "red", radius: 0.015});
            builder.addSegment(tetraVertices[1], centroid1, {color: "red", radius: 0.015});
            builder.addSegment(tetraVertices[2], centroid2, {color: "red", radius: 0.015});
            builder.addSegment(tetraVertices[3], centroid3, {color: "red", radius: 0.015});

            const tetraCentroid = tetraVertices[0].clone().add(tetraVertices[1]).add(tetraVertices[2]).add(tetraVertices[3]).multiplyScalar(0.25);
            builder.addPoint(tetraCentroid, {color: "red", radius: 0.052});
            break;
        }

        case 45:
        case 46:
        case 47:
        case 48:
        case 49:
        case 50:
        case 51: {
            const box = new THREE.BoxGeometry(2.4, 1.7, 1.45);
            const rotation = new THREE.Euler(0.22, 0.65, 0.05);
            builder.addSolidWithWire(box, {
                color: "white",
                opacity: 0.15,
                wireColor: "black",
                wireOpacity: 0.9,
                rotation,
            });

            if (ruleNumber === 46) {
                builder.addPolygon([
                    v3(-1.2, -0.85, -0.72),
                    v3(1.2, -0.85, -0.72),
                    v3(1.2, -0.85, 0.72),
                    v3(-1.2, -0.85, 0.72),
                ], {
                    color: "white",
                    fillOpacity: 0.12,
                    outlineColor: "red",
                    outlineOpacity: 0.7,
                });
                builder.addPolygon([
                    v3(-1.2, 0.85, -0.72),
                    v3(1.2, 0.85, -0.72),
                    v3(1.2, 0.85, 0.72),
                    v3(-1.2, 0.85, 0.72),
                ], {
                    color: "white",
                    fillOpacity: 0.1,
                    outlineColor: "red",
                    outlineOpacity: 0.7,
                });
            }

            if (ruleNumber === 47 || ruleNumber === 49 || ruleNumber === 50) {
                const corners = [
                    v3(-1.2, -0.85, -0.72),
                    v3(1.2, -0.85, -0.72),
                    v3(1.2, 0.85, -0.72),
                    v3(-1.2, 0.85, -0.72),
                    v3(-1.2, -0.85, 0.72),
                    v3(1.2, -0.85, 0.72),
                    v3(1.2, 0.85, 0.72),
                    v3(-1.2, 0.85, 0.72),
                ];

                builder.addSegment(corners[0], corners[6], {color: "red", radius: 0.017});
                builder.addSegment(corners[1], corners[7], {color: "red", radius: 0.017});

                if (ruleNumber === 50) {
                    builder.addSegment(corners[2], corners[4], {color: "red", radius: 0.017});
                    builder.addSegment(corners[3], corners[5], {color: "red", radius: 0.017});
                }
            }

            if (ruleNumber === 48) {
                const vertex = v3(-1.2, -0.85, -0.72);
                builder.addRightAngleMarker(vertex, v3(1, 0, 0), v3(0, 1, 0), 0.22, {color: "red"});
                builder.addRightAngleMarker(vertex, v3(1, 0, 0), v3(0, 0, 1), 0.22, {color: "red"});
            }

            if (ruleNumber === 51) {
                builder.addPolygon([v3(-1.4, -1.2, -0.1), v3(1.4, -0.55, -0.1), v3(1.1, 1.25, -0.1), v3(-1.7, 0.6, -0.1)], {
                    color: "white",
                    fillOpacity: 0.12,
                    outlineColor: "red",
                    outlineOpacity: 0.72,
                });
                builder.addPolyline([v3(-0.95, -0.85, -0.1), v3(1.05, -0.4, -0.1), v3(0.8, 0.95, -0.1), v3(-1.2, 0.5, -0.1)], {
                    color: "red",
                    radius: 0.016,
                    closed: true,
                });
            }
            break;
        }

        case 52: {
            addEdgeSet(builder, tetraVertices, tetraEdges, {color: "black", radius: 0.014});
            builder.addPolygon([v3(-0.7, -0.2, -0.2), v3(0.75, -0.1, 0.2), v3(-0.02, 0.6, 0.55)], {
                color: "white",
                fillOpacity: 0.14,
                outlineColor: "red",
                outlineOpacity: 0.76,
            });
            break;
        }

        case 53: {
            builder.addSolidWithWire(new THREE.TetrahedronGeometry(0.5), {
                position: v3(-1.2, 0.35, -0.55),
                color: "white",
                opacity: 0.15,
            });
            builder.addSolidWithWire(new THREE.BoxGeometry(0.85, 0.85, 0.85), {
                position: v3(0, 0.25, -0.5),
                color: "white",
                opacity: 0.14,
            });
            builder.addSolidWithWire(new THREE.OctahedronGeometry(0.55), {
                position: v3(1.2, 0.3, -0.45),
                color: "white",
                opacity: 0.15,
            });
            builder.addSolidWithWire(new THREE.IcosahedronGeometry(0.52), {
                position: v3(-0.55, -0.65, 0.72),
                color: "white",
                opacity: 0.12,
            });
            builder.addSolidWithWire(new THREE.DodecahedronGeometry(0.58), {
                position: v3(0.85, -0.68, 0.82),
                color: "white",
                opacity: 0.12,
                wireColor: "red",
            });
            break;
        }

        case 54: {
            const box = new THREE.BoxGeometry(1.8, 1.8, 1.8);
            builder.addSolidWithWire(box, {
                color: "white",
                opacity: 0.16,
                wireColor: "black",
            });

            builder.addPoint(v3(0.9, 0.9, 0.9), {color: "red", radius: 0.06});
            builder.addSegment(v3(0.9, 0.9, 0.9), v3(-0.9, 0.9, 0.9), {color: "red", radius: 0.018});
            builder.addPolygon([v3(-0.9, -0.9, 0.9), v3(0.9, -0.9, 0.9), v3(0.9, 0.9, 0.9), v3(-0.9, 0.9, 0.9)], {
                color: "white",
                fillOpacity: 0.12,
                outlineColor: "red",
                outlineOpacity: 0.78,
            });
            break;
        }

        case 55: {
            builder.addSolidWithWire(new THREE.BoxGeometry(2.1, 2.1, 2.1), {
                color: "white",
                opacity: 0.16,
                wireColor: "black",
            });
            builder.addSegment(v3(-1.05, -1.05, -1.05), v3(1.05, 1.05, 1.05), {
                color: "red",
                radius: 0.018,
            });
            break;
        }

        case 56: {
            builder.addSolidWithWire(new THREE.OctahedronGeometry(1.25), {
                color: "white",
                opacity: 0.15,
                wireColor: "red",
                wireOpacity: 0.95,
            });
            break;
        }

        case 57: {
            builder.addSolidWithWire(new THREE.IcosahedronGeometry(1.18), {
                color: "white",
                opacity: 0.12,
                wireColor: "red",
                wireOpacity: 0.95,
            });
            break;
        }

        case 58: {
            builder.addSolidWithWire(new THREE.DodecahedronGeometry(1.2), {
                color: "white",
                opacity: 0.12,
                wireColor: "red",
                wireOpacity: 0.95,
            });
            break;
        }

        case 59:
        default: {
            builder.addSolidWithWire(new THREE.IcosahedronGeometry(1.05), {
                color: "white",
                opacity: 0.14,
                wireColor: "black",
            });

            const p = v3(-0.4, 0.15, -0.1);
            const q = v3(0.58, -0.25, 0.35);
            builder.addPoint(p, {color: "red", radius: 0.052});
            builder.addPoint(q, {color: "red", radius: 0.052});
            builder.addSegment(p, q, {color: "red", radius: 0.016});
            break;
        }
    }
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {number} ruleNumber
 * @returns {void}
 */
function buildRoundBodiesScene(builder, ruleNumber) {
    switch (ruleNumber) {
        case 60:
        case 61:
        case 64: {
            const height = 2;
            const radius = 0.9;
            builder.addSolidWithWire(new THREE.CylinderGeometry(radius, radius, height, 48, 1, true), {
                color: "white",
                opacity: 0.12,
                wireColor: "black",
                wireOpacity: 0.82,
            });
            builder.addCircle(v3(0, -height / 2, 0), v3(0, 1, 0), radius, {
                color: "black",
                lineRadius: 0.012,
                opacity: 0.92,
            });
            builder.addCircle(v3(0, height / 2, 0), v3(0, 1, 0), radius, {
                color: "red",
                lineRadius: 0.012,
                opacity: 0.92,
            });

            if (ruleNumber === 61) {
                builder.addSegment(v3(radius, -height / 2, 0), v3(radius, height / 2, 0), {
                    color: "red",
                    radius: 0.018,
                });
            }

            if (ruleNumber === 64) {
                builder.addPolygon([v3(0.25, -1.2, -1.1), v3(0.25, 1.2, -1.1), v3(0.25, 1.2, 1.1), v3(0.25, -1.2, 1.1)], {
                    color: "white",
                    fillOpacity: 0.11,
                    outlineColor: "red",
                    outlineOpacity: 0.78,
                });
                builder.addPolyline([v3(0.25, -1, -0.86), v3(0.25, 1, -0.86), v3(0.25, 1, 0.86), v3(0.25, -1, 0.86)], {
                    color: "red",
                    radius: 0.016,
                    closed: true,
                });
            }
            break;
        }

        case 62:
        case 65:
        case 67: {
            const height = 2.3;
            const radius = 1.05;
            const apex = v3(0, height / 2, 0);
            const baseY = -height / 2;

            builder.addSolidWithWire(new THREE.ConeGeometry(radius, height, 56, 1, true), {
                color: "white",
                opacity: 0.12,
                wireColor: "black",
                wireOpacity: 0.84,
            });
            builder.addCircle(v3(0, baseY, 0), v3(0, 1, 0), radius, {
                color: "black",
                lineRadius: 0.012,
                opacity: 0.92,
            });

            if (ruleNumber === 67) {
                const a = v3(radius, baseY, 0);
                const b = v3(-radius * 0.55, baseY, radius * 0.82);
                builder.addSegment(apex, a, {color: "red", radius: 0.018});
                builder.addSegment(apex, b, {color: "red", radius: 0.018});
            }

            if (ruleNumber === 65) {
                builder.addPolygon([apex, v3(0, baseY, -radius), v3(0, baseY, radius)], {
                    color: "white",
                    fillOpacity: 0.16,
                    outlineColor: "red",
                    outlineOpacity: 0.84,
                });
            }
            break;
        }

        case 63: {
            builder.addSolidWithWire(new THREE.CylinderGeometry(0.45, 1.05, 2.2, 54, 1, true), {
                color: "white",
                opacity: 0.12,
                wireColor: "black",
                wireOpacity: 0.84,
            });
            builder.addCircle(v3(0, -1.1, 0), v3(0, 1, 0), 1.05, {
                color: "black",
                lineRadius: 0.012,
            });
            builder.addCircle(v3(0, 1.1, 0), v3(0, 1, 0), 0.45, {
                color: "red",
                lineRadius: 0.012,
            });
            break;
        }

        case 66: {
            builder.addSolidWithWire(new THREE.CylinderGeometry(0.8, 0.8, 2.1, 48, 1, true), {
                color: "white",
                opacity: 0.1,
                wireColor: "black",
                wireOpacity: 0.6,
            });
            builder.addArrow(v3(0, -1.1, 0), v3(0, 1, 0), 2.25, {color: "red"});
            break;
        }

        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74: {
            const sphereRadius = 1.2;
            const center = v3(0, 0, 0);
            builder.addSolidWithWire(new THREE.SphereGeometry(sphereRadius, 56, 36), {
                color: ruleNumber === 69 ? "white" : "white",
                opacity: ruleNumber === 69 ? 0.2 : 0.1,
                wireColor: "black",
                wireOpacity: 0.6,
            });

            if (ruleNumber === 68 || ruleNumber === 69) {
                const pointP = v3(sphereRadius * 0.84, sphereRadius * 0.35, sphereRadius * 0.38);
                builder.addPoint(center, {color: "black", radius: 0.05});
                builder.addSegment(center, pointP, {color: "red", radius: 0.018});
            }

            if (ruleNumber === 70) {
                builder.addPolygon([v3(-1.6, 0.2, -1.4), v3(1.6, 0.2, -1.4), v3(1.6, 0.2, 1.4), v3(-1.6, 0.2, 1.4)], {
                    color: "white",
                    fillOpacity: 0.1,
                    outlineColor: "red",
                    outlineOpacity: 0.64,
                });
                const sectionRadius = Math.sqrt(sphereRadius * sphereRadius - 0.2 * 0.2);
                builder.addCircle(v3(0, 0.2, 0), v3(0, 1, 0), sectionRadius, {
                    color: "red",
                    lineRadius: 0.018,
                });
            }

            if (ruleNumber === 71 || ruleNumber === 72) {
                const tangentPoint = v3(0, sphereRadius, 0);
                builder.addPolygon([v3(-1.5, sphereRadius, -1.5), v3(1.5, sphereRadius, -1.5), v3(1.5, sphereRadius, 1.5), v3(-1.5, sphereRadius, 1.5)], {
                    color: "white",
                    fillOpacity: 0.12,
                    outlineColor: "red",
                    outlineOpacity: 0.68,
                });
                builder.addPoint(tangentPoint, {color: "red", radius: 0.055});

                if (ruleNumber === 72) {
                    builder.addSegment(center, tangentPoint, {color: "red", radius: 0.018});
                    builder.addRightAngleMarker(tangentPoint, v3(1, 0, 0), v3(0, -1, 0), 0.25, {color: "black"});
                }
            }

            if (ruleNumber === 73) {
                builder.addCircle(center, v3(0, 1, 0), sphereRadius, {
                    color: "red",
                    lineRadius: 0.018,
                });
                builder.addCircle(v3(0, 0.42, 0), v3(0, 1, 0), Math.sqrt(sphereRadius * sphereRadius - 0.42 * 0.42), {
                    color: "black",
                    lineRadius: 0.012,
                    opacity: 0.72,
                });
            }

            if (ruleNumber === 74) {
                builder.addSolidWithWire(new THREE.BoxGeometry(1.45, 1.45, 1.45), {
                    color: "white",
                    opacity: 0.08,
                    wireColor: "red",
                    wireOpacity: 0.92,
                });
            }
            break;
        }

        case 75:
        default: {
            const radius = 1.15;
            const offset = 0.7;

            builder.addSolidWithWire(new THREE.SphereGeometry(radius, 50, 34), {
                color: "white",
                opacity: 0.1,
                wireColor: "black",
                wireOpacity: 0.58,
                position: v3(-offset, 0, 0),
            });
            builder.addSolidWithWire(new THREE.SphereGeometry(radius, 50, 34), {
                color: "white",
                opacity: 0.08,
                wireColor: "black",
                wireOpacity: 0.58,
                position: v3(offset, 0, 0),
            });

            let circleCenter = v3(0, 0, 0);
            let circleRadius = Math.sqrt(radius * radius - offset * offset);
            builder.addCircle(circleCenter, v3(1, 0, 0), circleRadius, {
                color: "red",
                lineRadius: 0.018,
                opacity: 0.95,
            });
            break;
        }
    }
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {number} ruleNumber
 * @returns {void}
 */
function buildVolumeScene(builder, ruleNumber) {
    switch (ruleNumber) {
        case 76: {
            builder.addSolidWithWire(new THREE.BoxGeometry(2, 1.6, 1.4), {
                color: "white",
                opacity: 0.22,
                wireColor: "black",
            });
            break;
        }

        case 77: {
            builder.addSolidWithWire(new THREE.BoxGeometry(1.1, 1.1, 1.1), {
                color: "white",
                opacity: 0.2,
                position: v3(-0.85, 0, 0),
            });
            builder.addSolidWithWire(new THREE.BoxGeometry(1.1, 1.1, 1.1), {
                color: "white",
                opacity: 0.2,
                position: v3(0.85, 0, 0),
                wireColor: "red",
            });
            break;
        }

        case 78: {
            builder.addSolidWithWire(new THREE.BoxGeometry(2.2, 1.2, 1.35), {
                color: "white",
                opacity: 0.18,
                wireColor: "black",
            });
            builder.addPolygon([v3(0, -0.6, -0.67), v3(0, 0.6, -0.67), v3(0, 0.6, 0.67), v3(0, -0.6, 0.67)], {
                color: "white",
                fillOpacity: 0.12,
                outlineColor: "red",
                outlineOpacity: 0.75,
            });
            break;
        }

        case 79: {
            builder.addSolidWithWire(new THREE.BoxGeometry(2.3, 1.5, 1.2), {
                color: "white",
                opacity: 0.2,
                wireColor: "black",
            });
            builder.addArrow(v3(-1.15, -0.75, -0.65), v3(1, 0, 0), 2.3, {color: "red"});
            builder.addArrow(v3(-1.2, -0.75, -0.65), v3(0, 1, 0), 1.5, {color: "black"});
            builder.addArrow(v3(-1.2, -0.75, -0.65), v3(0, 0, 1), 1.2, {color: "black"});
            break;
        }

        case 80: {
            builder.addSolidWithWire(new THREE.CylinderGeometry(0.9, 0.9, 2.1, 48), {
                color: "white",
                opacity: 0.16,
                wireColor: "black",
            });
            builder.addArrow(v3(0, -1.05, 0), v3(0, 1, 0), 2.1, {color: "red"});
            builder.addSegment(v3(0, -1.05, 0), v3(0.9, -1.05, 0), {color: "black", radius: 0.016});
            break;
        }

        case 81: {
            builder.addSolidWithWire(new THREE.BoxGeometry(1, 1, 1), {
                color: "white",
                opacity: 0.16,
                position: v3(-1, -0.25, 0),
            });
            builder.addSolidWithWire(new THREE.BoxGeometry(1.8, 1.8, 1.8), {
                color: "white",
                opacity: 0.16,
                position: v3(1.1, 0.15, 0),
                wireColor: "red",
            });
            builder.addArrow(v3(-0.2, -0.7, 0), v3(1, 0.35, 0), 1.3, {color: "red"});
            break;
        }

        case 82: {
            builder.addSolidWithWire(new THREE.BoxGeometry(1.65, 1.65, 1.65), {
                color: "white",
                opacity: 0.16,
                position: v3(-0.95, 0, 0),
                wireColor: "black",
            });
            builder.addSolidWithWire(new THREE.CylinderGeometry(0.85, 0.85, 1.97, 48), {
                color: "white",
                opacity: 0.16,
                position: v3(1, 0, 0),
                wireColor: "red",
            });
            break;
        }

        case 83:
        default: {
            builder.addSolidWithWire(new THREE.SphereGeometry(0.95, 46, 30), {
                color: "white",
                opacity: 0.14,
                position: v3(-0.95, 0, 0),
                wireColor: "black",
            });
            builder.addSolidWithWire(new THREE.SphereGeometry(0.95, 46, 24, 0, Math.PI * 1.76, 0.28, Math.PI - 0.52), {
                color: "white",
                opacity: 0.12,
                position: v3(1.0, 0, 0),
                wireColor: "red",
            });
            builder.addLabel("manifold", v3(-0.95, -1.2, 0), {size: 0.22, color: "black"});
            builder.addLabel("hole", v3(1.0, -1.2, 0), {size: 0.22, color: "red"});
            break;
        }
    }
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {number} ruleNumber
 * @returns {void}
 */
function buildVectorAndCoordinateScene(builder, ruleNumber) {
    switch (ruleNumber) {
        case 84: {
            const a = v3(-1.2, -0.5, -0.8);
            const b = v3(1.1, 0.8, 0.95);
            builder.addPoint(a, {color: "black", radius: 0.05});
            builder.addPoint(b, {color: "black", radius: 0.05});
            builder.addArrow(a, b.clone().sub(a), a.distanceTo(b), {color: "red"});
            builder.addLabel("A", a.clone().add(v3(-0.08, 0.16, 0)), {size: 0.22});
            builder.addLabel("B", b.clone().add(v3(0.08, 0.16, 0)), {size: 0.22});
            break;
        }

        case 85: {
            builder.addArrow(v3(-1.3, -0.55, -0.6), v3(1, 0.5, 0.35), 2.2, {color: "black"});
            builder.addArrow(v3(-0.25, 0.05, -0.25), v3(1, 0.5, 0.35), 1.55, {color: "red"});
            break;
        }

        case 86: {
            const origin = v3(0, 0, 0);
            const vectorA = v3(1.6, 0.35, 0.3);
            const vectorB = v3(0.65, 1.2, 0.95);
            const projectionScale = vectorB.dot(vectorA) / vectorA.lengthSq();
            const projection = vectorA.clone().multiplyScalar(projectionScale);

            builder.addArrow(origin, vectorA, vectorA.length(), {color: "black"});
            builder.addArrow(origin, vectorB, vectorB.length(), {color: "red"});
            builder.addSegment(vectorB, projection, {color: "black", radius: 0.012, opacity: 0.65});
            builder.addArc(origin, vectorA.clone().normalize(), vectorB.clone().normalize(), 0.45, 0.03, 0.95, {
                color: "red",
            });
            break;
        }

        case 87: {
            builder.addCoordinateAxes(1.45);
            builder.addArrow(v3(0, 0, 0), v3(1.2, 0.3, 0.2), 1.25, {color: "black"});
            builder.addArrow(v3(0, 0, 0), v3(0.15, 0.4, 1.2), 1.3, {color: "red"});
            builder.addArrow(v3(0, 0, 0), v3(0.35, -1.15, 0.45), 1.25, {color: "red", opacity: 0.8});
            break;
        }

        case 88: {
            const o = v3(-0.8, -0.55, -0.6);
            const a = v3(1.2, 0.2, 0.15);
            const b = v3(0.25, 1.15, 0.2);
            const c = v3(0.2, 0.2, 1.15);
            const sum = o.clone().add(a).add(b).add(c);

            builder.addArrow(o, a, a.length(), {color: "black"});
            builder.addArrow(o, b, b.length(), {color: "black"});
            builder.addArrow(o, c, c.length(), {color: "black"});

            builder.addSegment(o.clone().add(a), o.clone().add(a).add(b), {color: "black", radius: 0.012});
            builder.addSegment(o.clone().add(a), o.clone().add(a).add(c), {color: "black", radius: 0.012});
            builder.addSegment(o.clone().add(b), o.clone().add(a).add(b), {color: "black", radius: 0.012});
            builder.addSegment(o.clone().add(c), o.clone().add(a).add(c), {color: "black", radius: 0.012});
            builder.addSegment(o.clone().add(b).add(c), sum, {color: "black", radius: 0.012});
            builder.addSegment(o.clone().add(a).add(c), sum, {color: "black", radius: 0.012});
            builder.addSegment(o.clone().add(a).add(b), sum, {color: "black", radius: 0.012});

            builder.addArrow(o, sum.clone().sub(o), sum.clone().sub(o).length(), {color: "red"});
            break;
        }

        case 89: {
            const origin = v3(-1.2, -0.55, -0.35);
            const vector = v3(2.4, 1.25, 1.0);
            builder.addArrow(origin, vector, vector.length(), {color: "black"});
            builder.addArrow(origin, vector.clone().normalize(), 1, {color: "red"});
            break;
        }

        case 90: {
            builder.addArrow(v3(0, 0, 0), v3(1.6, 0.25, 0), 1.62, {color: "black"});
            builder.addArrow(v3(0, 0, 0), v3(-0.12, 1.55, 0.2), 1.57, {color: "red"});
            builder.addRightAngleMarker(v3(0, 0, 0), v3(1, 0.15, 0), v3(0, 1, 0.1), 0.28, {color: "black"});
            break;
        }

        case 91: {
            builder.addCoordinateAxes(1.5);
            const vector = v3(1.1, 0.95, 0.8);
            builder.addArrow(v3(0, 0, 0), vector, vector.length(), {color: "red"});
            builder.addDashedSegment(vector, v3(vector.x, 0, vector.z), {color: "black", opacity: 0.6});
            builder.addDashedSegment(v3(vector.x, 0, vector.z), v3(vector.x, vector.y, vector.z), {color: "black", opacity: 0.6});
            break;
        }

        case 92: {
            builder.addCoordinateAxes(1.8);
            break;
        }

        case 93: {
            builder.addCoordinateAxes(1.7);
            const point = v3(0.9, 1.1, 0.75);
            builder.addPoint(point, {color: "red", radius: 0.06});
            builder.addDashedSegment(point, v3(point.x, 0, point.z), {color: "black", opacity: 0.6});
            builder.addDashedSegment(v3(point.x, 0, point.z), v3(point.x, 0, 0), {color: "black", opacity: 0.6});
            builder.addDashedSegment(v3(point.x, 0, point.z), v3(0, 0, point.z), {color: "black", opacity: 0.6});
            break;
        }

        case 94: {
            const pointA = v3(-1.1, -0.6, -0.4);
            const pointB = v3(1.0, 0.95, 0.85);
            builder.addPoint(pointA, {color: "black", radius: 0.052});
            builder.addPoint(pointB, {color: "black", radius: 0.052});
            builder.addSegment(pointA, pointB, {color: "red", radius: 0.018});
            builder.addLabel("d(A,B)", pointA.clone().add(pointB).multiplyScalar(0.5).add(v3(0, 0.18, 0)), {
                color: "red",
                size: 0.24,
            });
            break;
        }

        case 95: {
            builder.addCoordinateAxes(1.65);
            const center = v3(0.55, 0.35, 0.4);
            const radius = 0.85;
            builder.addSolidWithWire(new THREE.SphereGeometry(radius, 46, 28), {
                color: "white",
                opacity: 0.1,
                wireColor: "red",
                wireOpacity: 0.9,
                position: center,
            });
            builder.addPoint(center, {color: "black", radius: 0.05});
            builder.addSegment(center, center.clone().add(v3(radius, 0, 0)), {color: "red", radius: 0.016});
            break;
        }

        case 96: {
            const pointA = v3(-1.4, -0.45, -0.6);
            const pointB = v3(1.2, 0.9, 0.75);
            const midpoint = pointA.clone().add(pointB).multiplyScalar(0.5);
            builder.addPoint(pointA, {color: "black"});
            builder.addPoint(pointB, {color: "black"});
            builder.addSegment(pointA, pointB, {color: "black", radius: 0.014});
            builder.addPoint(midpoint, {color: "red", radius: 0.06});
            builder.addLabel("M", midpoint.clone().add(v3(0.08, 0.16, 0)), {color: "red", size: 0.24});
            break;
        }

        case 97: {
            builder.addCoordinateAxes(1.8);
            builder.addSolidWithWire(new THREE.BoxGeometry(0.9, 0.7, 0.6), {
                color: "white",
                opacity: 0.16,
                wireColor: "black",
                position: v3(0.9, 0.55, 0.75),
                rotation: new THREE.Euler(0.4, 0.62, 0.2),
            });
            builder.addArrow(v3(0.9, 0.55, 0.75), v3(0.8, 0.35, 0.1), 0.9, {color: "red"});
            builder.addArrow(v3(0.9, 0.55, 0.75), v3(-0.1, 0.85, 0.25), 0.9, {color: "red"});
            builder.addArrow(v3(0.9, 0.55, 0.75), v3(0.15, 0.2, 0.85), 0.9, {color: "red"});
            break;
        }

        case 98:
        default: {
            const points = [
                v3(-1.1, -0.45, -0.55),
                v3(1.0, -0.6, -0.35),
                v3(1.25, 0.85, 0.25),
                v3(-0.45, 1.15, 0.95),
                v3(-1.35, 0.35, 0.45),
            ];

            builder.addPolyline(points, {
                color: "black",
                radius: 0.014,
                closed: true,
            });

            for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
                builder.addPoint(points[pointIndex], {color: "red", radius: 0.05});
                builder.addLabel(String(pointIndex), points[pointIndex].clone().add(v3(0.07, 0.16, 0.04)), {
                    color: "black",
                    size: 0.22,
                });
            }
            break;
        }
    }
}

/**
 * @param {AcademicSceneBuilder} builder
 * @param {number} ruleNumber
 * @returns {void}
 */
function buildTransformationScene(builder, ruleNumber) {
    const sourceTriangle = [v3(-1.15, -0.45, -0.45), v3(-0.2, 0.95, -0.15), v3(0.35, -0.12, 0.6)];

    function addTriangle(points, color) {
        builder.addPolyline(points, {color, radius: 0.016, closed: true});
        for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
            builder.addPoint(points[pointIndex], {color, radius: 0.047});
        }
    }

    switch (ruleNumber) {
        case 99: {
            let moved = sourceTriangle.map((point) => point.clone().applyAxisAngle(v3(0, 1, 0), 0.66).add(v3(1.35, 0.35, 0.4)));
            addTriangle(sourceTriangle, "black");
            addTriangle(moved, "red");
            builder.addDashedSegment(sourceTriangle[0], moved[0], {color: "black", opacity: 0.45});
            break;
        }

        case 100: {
            const center = v3(0.25, 0.2, 0.12);
            let symmetric = sourceTriangle.map((point) => center.clone().multiplyScalar(2).sub(point));
            addTriangle(sourceTriangle, "black");
            addTriangle(symmetric, "red");
            builder.addPoint(center, {color: "red", radius: 0.058});
            builder.addLabel("O", center.clone().add(v3(0.08, 0.14, 0.05)), {color: "red", size: 0.22});
            for (let pointIndex = 0; pointIndex < sourceTriangle.length; pointIndex += 1) {
                builder.addDashedSegment(sourceTriangle[pointIndex], symmetric[pointIndex], {
                    color: "black",
                    opacity: 0.45,
                });
            }
            break;
        }

        case 101: {
            const axisA = v3(0, -1.4, 0);
            const axisB = v3(0, 1.4, 0);
            let mirrored = sourceTriangle.map((point) => v3(-point.x, point.y, point.z));

            addTriangle(sourceTriangle, "black");
            addTriangle(mirrored, "red");
            builder.addSegment(axisA, axisB, {color: "black", radius: 0.018});
            for (let pointIndex = 0; pointIndex < sourceTriangle.length; pointIndex += 1) {
                builder.addDashedSegment(sourceTriangle[pointIndex], mirrored[pointIndex], {
                    color: "black",
                    opacity: 0.45,
                });
            }
            break;
        }

        case 102: {
            let translation = v3(1.45, 0.65, 0.35);
            let moved = sourceTriangle.map((point) => point.clone().add(translation));
            addTriangle(sourceTriangle, "black");
            addTriangle(moved, "red");
            builder.addArrow(v3(-0.05, -1.0, -0.45), translation, translation.length(), {color: "red"});
            break;
        }

        case 103: {
            let center = v3(-0.55, -0.4, -0.2);
            let scaled = sourceTriangle.map((point) => center.clone().add(point.clone().sub(center).multiplyScalar(1.6)).add(v3(0.9, 0.2, 0.35)));
            addTriangle(sourceTriangle, "black");
            addTriangle(scaled, "red");
            builder.addLabel("k", v3(0.75, 1.0, 0.55), {color: "red", size: 0.24});
            break;
        }

        case 104: {
            builder.addPolygon([v3(-0.2, -1.5, -1.6), v3(-0.2, 1.5, -1.6), v3(-0.2, 1.5, 1.6), v3(-0.2, -1.5, 1.6)], {
                color: "white",
                fillOpacity: 0.14,
                outlineColor: "black",
                outlineOpacity: 0.6,
            });

            let mirrored = sourceTriangle.map((point) => v3(-0.4 - point.x, point.y, point.z));
            addTriangle(sourceTriangle, "black");
            addTriangle(mirrored, "red");
            break;
        }

        case 105:
        default: {
            let moved = sourceTriangle.map((point) => point.clone().applyAxisAngle(v3(0, 1, 0), -0.45).add(v3(1.3, 0.45, 0.25)));
            addTriangle(sourceTriangle, "black");
            addTriangle(moved, "red");
            builder.addLabel("=", v3(0.42, 0.38, 0.18), {color: "red", size: 0.36});
            break;
        }
    }
}

/**
 * @param {{id: string, legacyItems: object[]}} cardDefinition
 * @returns {{group: THREE.Group, center: THREE.Vector3, radius: number}}
 */
function buildLegacyScene(cardDefinition) {
    let builder = new AcademicSceneBuilder();

    for (let itemIndex = 0; itemIndex < cardDefinition.legacyItems.length; itemIndex += 1) {
        let item = cardDefinition.legacyItems[itemIndex];

        if (item.type === "line") {
            builder.addPolyline(item.points, {
                color: item.color,
                radius: 0.008 + item.width * 0.0022,
                opacity: item.opacity,
            });
            continue;
        }

        if (item.type === "plane") {
            builder.addPolygon(item.points, {
                color: "white",
                fillOpacity: item.fillOpacity,
                outlineColor: item.color,
                outlineRadius: 0.008 + item.outlineWidth * 0.002,
                outlineOpacity: item.outlineOpacity,
            });
            continue;
        }

        if (item.type === "right-angle") {
            builder.addRightAngleMarker(item.origin, item.u, item.v, 0.26, {
                color: item.color,
                opacity: item.opacity,
                radius: 0.008 + item.width * 0.0018,
            });
            continue;
        }

        if (item.type === "label") {
            builder.addLabel(item.text, item.position, {
                color: item.color,
                size: Math.max(item.fontSize / 100, 0.16),
            });
        }
    }

    return builder.finish();
}

/**
 * @param {ReturnType<typeof normalizeCardDefinition>} cardDefinition
 * @returns {{group: THREE.Group, center: THREE.Vector3, radius: number}}
 */
function buildAcademicScene(cardDefinition) {
    let ruleNumber = parseRuleNumber(cardDefinition.id);
    if (ruleNumber <= 0) {
        return buildLegacyScene(cardDefinition);
    }

    let builder = new AcademicSceneBuilder();

    if (ruleNumber >= 1 && ruleNumber <= 10) {
        buildIncidenceScene(builder, ruleNumber);
    } else if (ruleNumber >= 11 && ruleNumber <= 22) {
        buildParallelScene(builder, ruleNumber);
    } else if (ruleNumber >= 23 && ruleNumber <= 32) {
        buildPerpendicularScene(builder, ruleNumber);
    } else if (ruleNumber >= 33 && ruleNumber <= 41) {
        buildAnglesAndSkewScene(builder, ruleNumber);
    } else if (ruleNumber >= 42 && ruleNumber <= 59) {
        buildPolyhedraScene(builder, ruleNumber);
    } else if (ruleNumber >= 60 && ruleNumber <= 75) {
        buildRoundBodiesScene(builder, ruleNumber);
    } else if (ruleNumber >= 76 && ruleNumber <= 83) {
        buildVolumeScene(builder, ruleNumber);
    } else if (ruleNumber >= 84 && ruleNumber <= 98) {
        buildVectorAndCoordinateScene(builder, ruleNumber);
    } else if (ruleNumber >= 99 && ruleNumber <= 105) {
        buildTransformationScene(builder, ruleNumber);
    } else {
        return buildLegacyScene(cardDefinition);
    }

    // Небольшая детерминированная вариативность угла сцены,
    // чтобы соседние правила не выглядели как копии.
    builder.group.rotation.y = ((ruleNumber % 9) - 4) * 0.06;
    builder.group.rotation.x = (((ruleNumber * 5) % 7) - 3) * 0.03;

    return builder.finish();
}

class CardEngine {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {THREE.WebGLRenderer} */
    #renderer;

    /** @type {THREE.Scene} */
    #scene;

    /** @type {THREE.PerspectiveCamera} */
    #camera;

    /** @type {THREE.Group | undefined} */
    #visualGroup;

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
    #cameraYaw = DEFAULT_CAMERA_YAW;

    /** @type {number} */
    #cameraPitch = DEFAULT_CAMERA_PITCH;

    /** @type {number} */
    #distanceScale = DEFAULT_CAMERA_ZOOM;

    /** @type {THREE.Vector3} */
    #sceneCenter = new THREE.Vector3();

    /** @type {number} */
    #sceneRadius = MIN_SCENE_RADIUS;

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

        this.#renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
        });
        this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.#renderer.setClearColor(new THREE.Color(COLOR_PALETTE.white), 1);

        this.#scene = new THREE.Scene();
        this.#scene.background = new THREE.Color(COLOR_PALETTE.white);

        this.#camera = new THREE.PerspectiveCamera(
            THREE.MathUtils.radToDeg(DEFAULT_FIELD_OF_VIEW),
            1,
            0.01,
            220
        );

        this.#statusElement = this.#createStatusElement();

        this.#scene.add(new THREE.AmbientLight(new THREE.Color("#ffffff"), 0.92));

        let keyLight = new THREE.DirectionalLight(new THREE.Color("#ffffff"), 0.65);
        keyLight.position.set(4.2, 5.3, 3.1);
        this.#scene.add(keyLight);

        let rimLight = new THREE.DirectionalLight(new THREE.Color("#ffe8e8"), 0.24);
        rimLight.position.set(-3.4, 2.1, -3.7);
        this.#scene.add(rimLight);

        this.#rootElement.replaceChildren(this.#renderer.domElement, this.#statusElement);

        this.#bindEvents();
        this.#observeResize();
        this.#handleResize();
    }

    /**
     * @returns {HTMLElement}
     */
    #createStatusElement() {
        let statusElement = document.createElement("div");
        statusElement.className = "model-status";
        statusElement.hidden = true;
        statusElement.setAttribute("role", "status");
        statusElement.setAttribute("aria-live", "polite");
        return statusElement;
    }

    /**
     * @param {string} cardUrl
     * @returns {Promise<void>}
     */
    async loadCard(cardUrl) {
        let response = await fetch(cardUrl, {cache: "no-store"});
        if (!response.ok) {
            throw new Error(`Card request failed: ${response.status}`);
        }

        let normalizedCardDefinition = normalizeCardDefinition(await response.json());
        this.#applyCardDefinition(normalizedCardDefinition);
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

    /** @returns {void} */
    destroy() {
        if (this.#renderFrameId !== undefined) {
            cancelAnimationFrame(this.#renderFrameId);
            this.#renderFrameId = undefined;
        }

        this.#resizeObserver?.disconnect();
        this.#eventAbortController.abort();

        if (this.#visualGroup) {
            this.#scene.remove(this.#visualGroup);
            disposeObjectTree(this.#visualGroup);
            this.#visualGroup = undefined;
        }

        this.#renderer.dispose();
        this.#activePointers.clear();
        this.#rootElement.classList.remove("is-dragging");
    }

    /** @returns {void} */
    #bindEvents() {
        let signal = this.#eventAbortController.signal;
        let canvasElement = this.#renderer.domElement;

        canvasElement.addEventListener(
            "pointerdown",
            this.#handlePointerDown.bind(this),
            {signal}
        );
        canvasElement.addEventListener(
            "pointermove",
            this.#handlePointerMove.bind(this),
            {signal}
        );
        canvasElement.addEventListener(
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
        this.#renderer.domElement.setPointerCapture(event.pointerId);
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
        let firstPointer = activePointers[0];
        let secondPointer = activePointers[1];

        let deltaX = secondPointer.x - firstPointer.x;
        let deltaY = secondPointer.y - firstPointer.y;
        let distance = Math.hypot(deltaX, deltaY);

        let pointerGroup = {
            distance,
            centerX: (firstPointer.x + secondPointer.x) * 0.5,
            centerY: (firstPointer.y + secondPointer.y) * 0.5,
        };

        if (!this.#lastPointerGroup) {
            this.#lastPointerGroup = pointerGroup;
            return;
        }

        if (pointerGroup.distance > EPSILON) {
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
        let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        this.#renderer.setPixelRatio(pixelRatio);
        this.#renderer.setSize(viewportWidth, viewportHeight, false);

        this.#camera.aspect = viewportWidth / viewportHeight;
        this.#camera.updateProjectionMatrix();

        this.#requestRender();
    }

    /**
     * @param {ReturnType<typeof normalizeCardDefinition>} cardDefinition
     * @returns {void}
     */
    #applyCardDefinition(cardDefinition) {
        this.#cardDefinition = cardDefinition;

        if (this.#visualGroup) {
            this.#scene.remove(this.#visualGroup);
            disposeObjectTree(this.#visualGroup);
            this.#visualGroup = undefined;
        }

        let sceneBuildResult = buildAcademicScene(cardDefinition);
        this.#visualGroup = sceneBuildResult.group;
        this.#sceneCenter.copy(sceneBuildResult.center);
        this.#sceneRadius = sceneBuildResult.radius;

        this.#cameraYaw = cardDefinition.camera.yaw;
        this.#cameraPitch = cardDefinition.camera.pitch;
        this.#distanceScale = cardDefinition.camera.zoom;

        this.#scene.add(this.#visualGroup);
        this.#requestRender();
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
        let viewportWidth = this.#renderer.domElement.width;
        let viewportHeight = this.#renderer.domElement.height;

        if (viewportWidth <= 0 || viewportHeight <= 0) {
            return;
        }

        this.#buildCameraState(viewportWidth, viewportHeight);
        this.#renderer.render(this.#scene, this.#camera);
    }

    /**
     * @param {number} viewportWidth
     * @param {number} viewportHeight
     * @returns {void}
     */
    #buildCameraState(viewportWidth, viewportHeight) {
        let viewportAspect = viewportWidth / Math.max(viewportHeight, 1);
        let fitDistance = computeFitDistance(this.#sceneRadius, viewportAspect);
        let distanceValue = fitDistance * this.#distanceScale;

        let horizontalDistance = distanceValue * Math.cos(this.#cameraPitch);
        let offset = new THREE.Vector3(
            Math.sin(this.#cameraYaw) * horizontalDistance,
            Math.sin(this.#cameraPitch) * distanceValue,
            Math.cos(this.#cameraYaw) * horizontalDistance
        );

        this.#camera.position.copy(this.#sceneCenter).add(offset);
        this.#camera.lookAt(this.#sceneCenter);
        this.#camera.near = Math.max(distanceValue * 0.02, 0.01);
        this.#camera.far = Math.max(distanceValue * 8, 80);
        this.#camera.updateProjectionMatrix();
    }
}

export {CardEngine};
