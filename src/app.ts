import * as PIXI from 'pixi.js';

interface IKeyboad {
    code: number;
    isDown: boolean;
    isUp: boolean;
    downHandler?: (e: KeyboardEvent) => void;
    upHandler?: (e: KeyboardEvent) => void;
}

function createBox(): PIXI.Graphics {
    let graphics = new PIXI.Graphics();
    graphics.beginFill(0xFFFF00);
    graphics.lineStyle(1, 0xFF0000);
    graphics.drawRect(0, 0, 20, 20);
    return graphics;
}

const createKey = (keyCode: number): IKeyboad => {
    let key: IKeyboad = {
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
    window.addEventListener("keydown", key.downHandler, true);
    window.addEventListener("keyup", key.upHandler, true);
    return key;
}

const keyboard = {
    LEFT: createKey(37),
    UP: createKey(38),
    RIGHT: createKey(39),
    DOWN: createKey(40)
};

class Game {

    static FPS = 60;

    public renderer: PIXI.Application

    public nextLoopTime: number
    public deltaLoopTime: number

    public gameElements: { [key: string]: PIXI.Graphics }

    constructor() {
        this.renderer = new PIXI.Application(800, 600, {
            view: <HTMLCanvasElement>document.getElementById('container'),
            backgroundColor : 0x1099bb,
            legacy: true,
        }, true);
        this.renderer.view.style.position = 'absolute';
        this.renderer.view.style.left = '50%';
        this.renderer.view.style.top = '50%';
        this.renderer.view.style.transform = 'translate3d( -50%, -60%, 0 )';

        this.nextLoopTime = Date.now();
        this.gameElements = {};

        this.create();

        this.runGameLoop();
    }

    public get interval(): number {
        return 1000 / <number>Game.FPS;
    }

    private create(): void {
        this.gameElements["box"] = createBox();
        this.renderer.stage.addChild(this.gameElements["box"]);
    }

    private update(): void {
        switch (true) {
            case keyboard.RIGHT.isDown:
                this.gameElements["box"].x += 5;
                break;
            case keyboard.LEFT.isDown:
                this.gameElements["box"].x -= 5;
                break;
            case keyboard.UP.isDown:
                this.gameElements["box"].y -= 5;
                break;
            case keyboard.DOWN.isDown:
                this.gameElements["box"].y += 5;
                break;
        }
    }

    public runGameLoop(): void {
        requestAnimationFrame(this.runGameLoop.bind(this));
         
        let now: number = Date.now();
        this.deltaLoopTime = <number>now - <number>this.nextLoopTime;

        console.log(1000/this.deltaLoopTime);
         
        if (this.deltaLoopTime > this.interval) {
            this.nextLoopTime = <number>now - (<number>this.deltaLoopTime % <number>this.interval);
            this.update();
            this.renderer.render();
        }
    }
}

(<any>window).MainGame = new Game();
