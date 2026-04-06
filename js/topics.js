import Topic from "../api/remote-topic.js";

const SERVICE_NAME = "radomir-ui";
const DEFAULT_PORT = 154;

const MODE_TOPIC_PATH = "/mode";
const VOICE_COMMAND_TOPIC_PATH = "services/sgu/cmd";
const GU_CONNECTED_TOPIC_PATH = "services/sgu/connected";
const RADOMIR_CONNECTED_TOPIC_PATH = "services/radomir/connected";
const ETHERCAT_CONNECTED_TOPIC_PATH = "services/ethercat-master/connected";

const FAST_CACHE_FREQUENCY = 20;
const STATUS_CACHE_FREQUENCY = 4;

/**
 * @param {number | undefined} port
 * @returns {string}
 */
function buildServiceUrl(port = DEFAULT_PORT) {
    let wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let host = window.location.host;

    if (typeof port === "number") {
        host = `${window.location.hostname}:${port}`;
    }

    return `${wsProtocol}//${host}/`;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function normalizeBooleanTopicValue(value) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        return value > 0;
    }

    if (typeof value === "string") {
        let normalizedValue = value.trim().toLowerCase();
        return (
            normalizedValue === "true"
            || normalizedValue === "1"
            || normalizedValue === "on"
            || normalizedValue === "connected"
        );
    }

    return false;
}

class Topics {
    /** @type {import("../api/remote-topic.js").default} */
    mode = new Topic(MODE_TOPIC_PATH, {
        readCacheFrequency: FAST_CACHE_FREQUENCY,
        writeCacheFrequency: FAST_CACHE_FREQUENCY,
    });

    /** @type {import("../api/remote-topic.js").default} */
    voiceCommand = new Topic(VOICE_COMMAND_TOPIC_PATH, {
        readCacheFrequency: FAST_CACHE_FREQUENCY,
    });

    /** @type {import("../api/remote-topic.js").default} */
    guConnected = new Topic(GU_CONNECTED_TOPIC_PATH, {
        readCacheFrequency: STATUS_CACHE_FREQUENCY,
    });

    /** @type {import("../api/remote-topic.js").default} */
    radomirServiceConnected = new Topic(RADOMIR_CONNECTED_TOPIC_PATH, {
        readCacheFrequency: STATUS_CACHE_FREQUENCY,
    });

    /** @type {import("../api/remote-topic.js").default} */
    ethercatMasterConnected = new Topic(ETHERCAT_CONNECTED_TOPIC_PATH, {
        readCacheFrequency: STATUS_CACHE_FREQUENCY,
    });

    constructor() {
        Topic.initialize(SERVICE_NAME, buildServiceUrl());
        Object.freeze(this);
    }
}

const topics = new Topics();

export {Topic, buildServiceUrl, normalizeBooleanTopicValue};
export default topics;
