export declare class CardEngine {
    constructor(rootElement?: HTMLElement | undefined);
    loadCard(cardUrl: string): Promise<void>;
    setStatus(statusText?: string): void;
    destroy(): void;
}
