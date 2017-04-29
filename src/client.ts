import * as io from 'socket.io-client';
import * as PIXI from "pixi.js";

var frameTime: number = (typeof global !== undefined) ? 30 : 60;

(function () {

    var lastTime: number = 0;
    var vendors: string[] = ["ms", "moz", "webkit", "o"];

    for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        let vendor: string = vendors[x];
        (window as any).requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame' ];
        (window as any).cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];
    }

    if (!window.requestAnimationFrame) {
        (window as any).requestAnimationFrame = (callback) => {
            let currTime: number = Date.now(),
                timeToCall: number = Math.max(0, frameTime - (currTime - lastTime));
            let id = window.setTimeout(() => {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if ( !window.cancelAnimationFrame ) {
        window.cancelAnimationFrame = (id) => {
            clearTimeout(id);
        };
    }

}());

const enum Direction {
    Down,
    Left,
    Right,
    Up
}

interface IPlayer {
    canvasEl?: PIXI.Container;
    inputs: IInput[];
}

interface IVector {
    x: number;
    y: number;
}

interface IInput {
    seq: number;
    time: number;
    input: Direction;
}

interface IKeyboad {
    code: number;
    isDown: boolean;
    isUp: boolean;
    downHandler?: (e: KeyboardEvent) => void;
    upHandler?: (e: KeyboardEvent) => void;
}

const createBox = (x: number, y: number, width: number, height: number): PIXI.Container => {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xFFFF00);
    graphics.lineStyle(1, 0xFF0000);
    graphics.drawRect(x, y, width, height);

    const container = new PIXI.Container();
    container.addChild(graphics);
    return container;
};

const createText = (x: number, y: number, label: string): PIXI.Text => {
    const text = new PIXI.Text(label);
    text.x = x;
    text.y = y;
    return text;
};

const createKey = (keyCode: number): IKeyboad => {
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


abstract class BaseCore {

    public updateId: number;
    public inputSeq: number;
    public keyboard:  { [direction: Direction]: IKeyboad };

    public nextLoopTime: number;
    public deltaLoopTime: number;

    constructor() {
        this.keyboard = {
            [Direction.Down]: createKey(40),
            [Direction.Left]: createKey(37),
            [Direction.Right]: createKey(39),
            [Direction.Up]: createKey(38),
        };
    }

    public runLoop(): void {
        this.updateId = requestAnimationFrame(this.runLoop.bind(this));
        this.inputSeq = 0;

        const now: number = Date.now();
        this.deltaLoopTime = now as number - this.nextLoopTime as number;

        if (this.deltaLoopTime > this.interval) {
            this.nextLoopTime = now as number - (this.deltaLoopTime as number % this.interval as number);
            this.update();
        }
    }

    public abstract update(): void;

    private get interval(): number {
        return 1000 / frameTime;
    }

    public handleInput(player: any): void {
        let input: Direction;
        for (let direction in Object.keys(this.keyboard)) {
            if (this.keyboard[direction].isDown) {
                input = parseInt(direction);
                break;
            }
        }
        if (typeof input !== "undefined") {
            this.inputSeq += 1;
            player.inputs.push({
                seq: this.inputSeq,
                time: Math.floor(Date.now() / 1000),
                input: input,
            } as IInput);
        }
    }

    private processInput(player: any): IVector {
        let vector: IVector = {x: 0, y: 0};
        for (let input of player.inputs) {
            //don't process ones we already have simulated locally
            if (input.seq <= player.lastInputSeq)
                continue;

            switch (input.input) {
                case Direction.Down:
                    vector.y += 1;
                    break;
                case Direction.Left:
                    vector.x -= 1;
                    break;
                case Direction.Right:
                    vector.x += 1;
                    break;                
                case Direction.Up:
                    vector.y -= 1;
                    break;
            }
        }

        if (player.inputs.length) {
            player.lastInputTime = player.inputs[player.inputs.length - 1].time;
            player.lastInputSeq = player.inputs[player.inputs.length - 1].seq;
        }

        return vector;
    }
}

class ClientGame extends BaseCore {

    public canvas: HTMLCanvasElement;
    public renderer: PIXI.Application;

    public player: IPlayer;
    public clientPredict: boolean;
    public gameElements: { [key: string]: any };

    private io: any;

    constructor() {
        super();
        this.canvas = document.getElementById("sgl") as HTMLCanvasElement;
        this.renderer = new PIXI.Application(800, 600, {
            backgroundColor : 0x1099bb,
            legacy: true,
            view: this.canvas,
        }, true);

        this.gameElements = {};
        this.clientPredict = false;

        this.createSocket();
        this.create();
        this.runLoop();
    }

    public update(): void {
        // check syncs from server
        // TODO: this.checkSyncs();
        // process user input
        this.handleInput(this.player);
        // send input to server
        this.sendInputToServer();
        // apply input localy
        this.updateLocalPosition();
        //TODO: this.checkCollision();
        // rerender map
        this.renderer.render();
    }

    // public getLatency(): void {
    //     this.io.emit("latency", {
    //         timestamp: Date.now()
    //     });
    // }

    private sendInputToServer()

    private updateLocalPosition(): void {
        if (!this.clientPredict) return;
    }

    private createSocket(): void {
        this.io = io("http://localhost:9001");
        this.io.on("connect", () => {
            console.log("open");
        });
        this.io.on("message", (data: any) => {
            console.log(data);
        });
        // this.io.on("latency", (data: any) => {
        //     this.gameElements.latency.text = "Latency: " + (data.timestamp - data.processed).toString();
        // });
        this.io.on("disconnect", () => {
            console.log("closed");
        });
    }

    private create(): void {
        this.gameElements.box = createBox(this.canvas.width / 2, this.canvas.height / 2, 20, 20);
        this.renderer.stage.addChild(this.gameElements.box);

        // this.gameElements.latency = createText(0, 20, "Latency: 0");
        // this.gameElements.latency.x = this.canvas.width - this.gameElements.latency.width - 20;
        // this.renderer.stage.addChild(this.gameElements.latency);

        // setInterval(() => {
        //     this.getLatency();
        // }, 500);

        this.player = {
            inputs: [],
            canvasEl: this.gameElements.box,
        };

    }
}

(window as any).MainGame = new ClientGame();
