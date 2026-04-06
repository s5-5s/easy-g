export declare class SideBar {
    constructor(maxItems?: number, rootElement?: HTMLElement | undefined);
    get element(): HTMLElement;
    get micEnabled(): boolean;
    initialize(): void;
    pushCommand(text: string): void;
    setMicEnabled(isEnabled: boolean): void;
    setRecognizing(isRecognizing: boolean): void;
    setConnected(isConnected: boolean): void;
    destroy(): void;
}
