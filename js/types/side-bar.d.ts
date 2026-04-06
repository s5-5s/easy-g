export declare class SideBar {
    constructor(rootElement?: HTMLElement | undefined);
    get element(): HTMLElement;
    initialize(): Promise<void> | undefined;
    onCardToggle(handler: (entry: any, isOpen: boolean) => void): () => void;
    destroy(): void;
}
