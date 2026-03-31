import * as THREE from "./vendor/three.module.js";
import {OrbitControls} from "./vendor/OrbitControls.js";
import {createTopicModel, createThemePalette} from "./geometry-model-factory.js";

class ModelView {
    /** @type {HTMLElement} */
    #rootElement;

    /** @type {THREE.WebGLRenderer | undefined} */
    #rendererObject;

    /** @type {THREE.Scene | undefined} */
    #sceneObject;

    /** @type {THREE.PerspectiveCamera | undefined} */
    #cameraObject;

    /** @type {OrbitControls | undefined} */
    #controlsObject;

    /** @type {THREE.DirectionalLight | undefined} */
    #keyLight;

    /** @type {THREE.HemisphereLight | undefined} */
    #fillLight;

    /** @type {THREE.Group | undefined} */
    #modelGroup;

    /** @type {string} */
    #theme = "dark";

    /** @type {object | undefined} */
    #topicObject;

    /** @type {string} */
    #topicIdentifier = "";

    /** @type {number | undefined} */
    #animationFrameIdentifier;

    /** @type {ResizeObserver | undefined} */
    #resizeObserverObject;

    /** @type {(() => void) | undefined} */
    #resizeFallbackHandler;

    /** @type {boolean} */
    #initialized = false;

    /**
     * @param {HTMLElement | undefined} rootElement
     */
    constructor(rootElement) {
        this.#rootElement = rootElement instanceof HTMLElement ? rootElement : document.createElement("div");
        this.#rootElement.classList.add("model-view");
    }

    /** @returns {HTMLElement} */
    get element() {
        return this.#rootElement;
    }

    /** @returns {void} */
    initialize() {
        if (this.#initialized) {
            return;
        }

        this.#createThreeEnvironment();
        this.#setupResizeTracking();
        this.#startAnimationLoop();
        this.#initialized = true;
    }

    /**
     * @param {string | undefined} themeValue
     * @returns {void}
     */
    setTheme(themeValue) {
        if (themeValue !== "dark" && themeValue !== "light") {
            return;
        }

        if (this.#theme === themeValue && this.#rendererObject) {
            return;
        }

        this.#theme = themeValue;
        this.#applyThemeToRenderer();
        this.#renderCurrentTopic();
    }

    /**
     * @param {object | undefined} topicObject
     * @returns {void}
     */
    setTopic(topicObject) {
        let nextTopicIdentifier = getString(topicObject, "id");
        if (nextTopicIdentifier && nextTopicIdentifier === this.#topicIdentifier && this.#modelGroup) {
            return;
        }

        this.#topicObject = topicObject;
        this.#topicIdentifier = nextTopicIdentifier;
        this.#renderCurrentTopic();
    }

    /** @returns {void} */
    destroy() {
        if (this.#animationFrameIdentifier !== undefined) {
            window.cancelAnimationFrame(this.#animationFrameIdentifier);
            this.#animationFrameIdentifier = undefined;
        }

        this.#resizeObserverObject?.disconnect();
        this.#resizeObserverObject = undefined;

        if (this.#resizeFallbackHandler) {
            window.removeEventListener("resize", this.#resizeFallbackHandler);
            this.#resizeFallbackHandler = undefined;
        }

        this.#controlsObject?.dispose();
        this.#controlsObject = undefined;

        this.#disposeObject(this.#modelGroup);
        this.#modelGroup = undefined;

        this.#rendererObject?.dispose();
        this.#rendererObject = undefined;

        this.#sceneObject = undefined;
        this.#cameraObject = undefined;
    }

    /** @returns {void} */
    #createThreeEnvironment() {
        let sceneObject = new THREE.Scene();
        let cameraObject = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
        cameraObject.position.set(4.8, 3.8, 5.8);

        let rendererObject = new THREE.WebGLRenderer({antialias: true, alpha: false});
        rendererObject.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        rendererObject.setSize(10, 10, false);

        let controlsObject = new OrbitControls(cameraObject, rendererObject.domElement);
        controlsObject.enableDamping = true;
        controlsObject.dampingFactor = 0.075;
        controlsObject.rotateSpeed = 0.66;
        controlsObject.zoomSpeed = 0.9;
        controlsObject.panSpeed = 0.6;
        controlsObject.minDistance = 2;
        controlsObject.maxDistance = 24;

        let keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(6, 8, 5);
        sceneObject.add(keyLight);

        let fillLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.5);
        sceneObject.add(fillLight);

        this.#rootElement.prepend(rendererObject.domElement);

        this.#sceneObject = sceneObject;
        this.#cameraObject = cameraObject;
        this.#rendererObject = rendererObject;
        this.#controlsObject = controlsObject;
        this.#keyLight = keyLight;
        this.#fillLight = fillLight;

        this.#applyThemeToRenderer();
        this.#resizeRenderer();
    }

    /** @returns {void} */
    #applyThemeToRenderer() {
        if (!this.#rendererObject || !this.#keyLight || !this.#fillLight) {
            return;
        }

        let isDark = this.#theme === "dark";

        this.#rendererObject.setClearColor(isDark ? 0x000000 : 0xffffff, 1);
        this.#keyLight.intensity = isDark ? 1.2 : 1.05;
        this.#fillLight.intensity = isDark ? 0.45 : 0.55;
    }

    /** @returns {void} */
    #setupResizeTracking() {
        if (typeof ResizeObserver !== "undefined") {
            this.#resizeObserverObject = new ResizeObserver(() => this.#resizeRenderer());
            this.#resizeObserverObject.observe(this.#rootElement);
            return;
        }

        this.#resizeFallbackHandler = () => this.#resizeRenderer();
        window.addEventListener("resize", this.#resizeFallbackHandler);
    }

    /** @returns {void} */
    #startAnimationLoop() {
        let renderFrame = () => {
            this.#animationFrameIdentifier = window.requestAnimationFrame(renderFrame);

            this.#controlsObject?.update();
            if (this.#rendererObject && this.#sceneObject && this.#cameraObject) {
                this.#rendererObject.render(this.#sceneObject, this.#cameraObject);
            }
        };

        renderFrame();
    }

    /** @returns {void} */
    #resizeRenderer() {
        if (!this.#rendererObject || !this.#cameraObject) {
            return;
        }

        let nextWidth = Math.max(12, this.#rootElement.clientWidth);
        let nextHeight = Math.max(12, this.#rootElement.clientHeight);

        this.#rendererObject.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.#rendererObject.setSize(nextWidth, nextHeight, false);

        this.#cameraObject.aspect = nextWidth / nextHeight;
        this.#cameraObject.updateProjectionMatrix();
    }

    /** @returns {void} */
    #renderCurrentTopic() {
        if (!this.#sceneObject || !this.#cameraObject || !this.#controlsObject || !this.#topicObject) {
            return;
        }

        this.#rootElement.classList.remove("is-error");

        try {
            let paletteObject = createThemePalette(this.#theme);
            let modelDescription = createTopicModel(
                getString(this.#topicObject, "modelKey"),
                THREE,
                paletteObject
            );

            this.#replaceModel(modelDescription.groupObject);
            this.#applyView(modelDescription.cameraPosition, modelDescription.targetPosition);
        } catch {
            this.#rootElement.classList.add("is-error");
        }
    }

    /**
     * @param {THREE.Group | undefined} nextModel
     * @returns {void}
     */
    #replaceModel(nextModel) {
        if (!this.#sceneObject || !nextModel) {
            return;
        }

        if (this.#modelGroup) {
            this.#sceneObject.remove(this.#modelGroup);
            this.#disposeObject(this.#modelGroup);
        }

        this.#modelGroup = nextModel;
        this.#sceneObject.add(this.#modelGroup);
    }

    /**
     * @param {THREE.Vector3 | undefined} cameraPosition
     * @param {THREE.Vector3 | undefined} targetPosition
     * @returns {void}
     */
    #applyView(cameraPosition, targetPosition) {
        if (!this.#cameraObject || !this.#controlsObject) {
            return;
        }

        if (cameraPosition instanceof THREE.Vector3) {
            this.#cameraObject.position.copy(cameraPosition);
        }

        if (targetPosition instanceof THREE.Vector3) {
            this.#controlsObject.target.copy(targetPosition);
        }

        this.#cameraObject.updateProjectionMatrix();
        this.#controlsObject.update();
    }

    /**
     * @param {THREE.Object3D | undefined} object3D
     * @returns {void}
     */
    #disposeObject(object3D) {
        if (!object3D) {
            return;
        }

        object3D.traverse((childObject) => {
            if (
                !(
                    childObject instanceof THREE.Mesh ||
                    childObject instanceof THREE.Line ||
                    childObject instanceof THREE.Sprite
                )
            ) {
                return;
            }

            if (childObject.geometry && "dispose" in childObject.geometry) {
                childObject.geometry.dispose();
            }

            if (!childObject.material) {
                return;
            }

            if (Array.isArray(childObject.material)) {
                childObject.material.forEach((materialObject) => materialObject?.dispose?.());
                return;
            }

            childObject.material.dispose?.();
        });
    }
}

/**
 * @param {object | undefined} sourceObject
 * @param {string} keyName
 * @returns {string}
 */
function getString(sourceObject, keyName) {
    let value = sourceObject?.[keyName];
    return typeof value === "string" ? value : "";
}

export {ModelView};
