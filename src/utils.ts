import * as PIXI from "pixi.js";

export interface IKeyboad {
    code: number;
    isDown: boolean;
    isUp: boolean;
    downHandler?: (e: KeyboardEvent) => void;
    upHandler?: (e: KeyboardEvent) => void;
}

export const createBox = (x: number, y: number, width: number, height: number): PIXI.Container => {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xFFFF00);
    graphics.lineStyle(1, 0xFF0000);
    graphics.drawRect(0, 0, width, height);

    const container = new PIXI.Container();
    container.addChild(graphics);
    container.position.set(x - 0.5 * width, y - 0.5 * height);
    return container;
};

export const createText = (x: number, y: number, label: string): PIXI.Text => {
    const text = new PIXI.Text(label);
    text.x = x;
    text.y = y;
    return text;
};

export const createKey = (keyCode: number): IKeyboad => {
    const key: IKeyboad = {
        code: keyCode,
        isDown: false,
        isUp: true,
    };
    key.downHandler = (e) => {
        if (e.keyCode === key.code) {
            key.isDown = true;
            key.isUp = false;
        }
    };
    key.upHandler = (e) => {
        if (e.keyCode === key.code) {
            key.isDown = false;
            key.isUp = true;
        }
    };
    window.addEventListener("keydown", key.downHandler, false);
    window.addEventListener("keyup", key.upHandler, false);
    return key;
};
