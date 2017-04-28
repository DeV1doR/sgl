interface IKeyboad {
    code: number;
    isDown: boolean;
    isUp: boolean;
    downHandler?: (e: KeyboardEvent) => void;
    upHandler?: (e: KeyboardEvent) => void;
}

export const createBox = (): PIXI.DisplayObject => {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xFFFF00);
    graphics.lineStyle(1, 0xFF0000);
    graphics.drawRect(0, 0, 20, 20);

    const container = new PIXI.Container();
    container.addChild(graphics);
    return container;
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
