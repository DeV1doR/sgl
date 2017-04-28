import * as PIXI from "pixi.js";

import * as utils from "./utils";

class Game {

    public static FPS = 60;

    public renderer: PIXI.Application;

    public nextLoopTime: number;
    public deltaLoopTime: number;
    public keyboard: utils.IKeyboad;

    public gameElements: { [key: string]: PIXI.DisplayObject };

    constructor() {
        this.renderer = new PIXI.Application(800, 600, {
            backgroundColor : 0x1099bb,
            legacy: true,
            view: document.getElementById("sgl") as HTMLCanvasElement,
        }, true);

        this.nextLoopTime = Date.now();
        this.gameElements = {};
        this.keyboard = {
            DOWN: utils.createKey(40),
            LEFT: utils.createKey(37),
            RIGHT: utils.createKey(39),
            UP: utils.createKey(38),
        };

        this.create();

        this.runGameLoop();
    }

    public get interval(): number {
        return 1000 / Game.FPS as number;
    }

    private create(): void {
        this.gameElements.box = utils.createBox();
        this.renderer.stage.addChild(this.gameElements.box);
    }

    private update(): void {
        switch (true) {
            case this.keyboard.RIGHT.isDown:
                this.gameElements.box.x += 5;
                break;
            case this.keyboard.LEFT.isDown:
                this.gameElements.box.x -= 5;
                break;
            case this.keyboard.UP.isDown:
                this.gameElements.box.y -= 5;
                break;
            case this.keyboard.DOWN.isDown:
                this.gameElements.box.y += 5;
                break;
        }
    }

    private runGameLoop(): void {
        requestAnimationFrame(this.runGameLoop.bind(this));

        const now: number = Date.now();
        this.deltaLoopTime = now as number - this.nextLoopTime as number;

        if (this.deltaLoopTime > this.interval) {
            this.nextLoopTime = now as number - (this.deltaLoopTime as number % this.interval as number);
            this.update();
            this.renderer.render();
        }
    }
}

(window as any).MainGame = new Game();
