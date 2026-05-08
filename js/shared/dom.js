function findElement(rootElement, selector) {
    if (!(rootElement instanceof HTMLElement)) {
        return undefined;
    }

    let foundElement = rootElement.querySelector(selector);
    return foundElement instanceof HTMLElement ? foundElement : undefined;
}

function findButton(rootElement, selector) {
    let foundElement = findElement(rootElement, selector);
    return foundElement instanceof HTMLButtonElement ? foundElement : undefined;
}

function findTemplate(rootElement, selector) {
    if (!(rootElement instanceof HTMLElement)) {
        return undefined;
    }

    let foundElement = rootElement.querySelector(selector);
    return foundElement instanceof HTMLTemplateElement ? foundElement : undefined;
}

function createElement(tagName, className = "") {
    let element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }

    return element;
}

export {createElement, findButton, findElement, findTemplate};
