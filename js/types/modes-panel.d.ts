export declare class ModesPanel {
    constructor(rootElement?: HTMLElement | undefined);
    get element(): HTMLElement;
    get mode(): string;
    initialize(): void;
    setMode(mode: string): void;
    onModeChange(handler: (mode: string) => void): () => void;
    offModeChange(handler: (mode: string) => void): void;
    destroy(): void;
}
