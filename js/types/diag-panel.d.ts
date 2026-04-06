export declare class DiagPanel {
    constructor(rootElement?: HTMLElement | undefined);
    get element(): HTMLElement;
    initialize(): void;
    setServiceState(serviceKey: string, isConnected: boolean): void;
    setAllDisconnected(): void;
    destroy(): void;
}
