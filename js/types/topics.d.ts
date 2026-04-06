export declare const Topic: typeof import("../../api/remote-topic.js").default;

export declare function buildServiceUrl(port?: number): string;
export declare function normalizeBooleanTopicValue(value: unknown): boolean;

declare class Topics {
    readonly mode: import("../../api/remote-topic.js").default;
    readonly voiceCommand: import("../../api/remote-topic.js").default;
    readonly guConnected: import("../../api/remote-topic.js").default;
    readonly radomirServiceConnected: import("../../api/remote-topic.js").default;
    readonly ethercatMasterConnected: import("../../api/remote-topic.js").default;
}

declare const topics: Topics;
export default topics;
