export declare class ModelPanel {
    constructor(rootElement?: HTMLElement | undefined);
    get element(): HTMLElement;
    initialize(): void;
    attachModelElement(modelElement: HTMLElement | undefined): void;
    attachSideBarElement(sideBarElement: HTMLElement | undefined): void;
}
