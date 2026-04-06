export declare class Model {
    constructor(rootElement?: HTMLElement | undefined);
    get element(): HTMLElement;
    initialize(): Promise<void> | undefined;
    loadCard(cardUrl: string): Promise<void> | undefined;
    destroy(): void;
}
