import * as io from 'socket.io-client';
import * as PIXI from "pixi.js";

import * as utils from "./utils";

class Game {

    public static FPS = 60;

    public canvas: HTMLCanvasElement;
    public renderer: PIXI.Application;

    public nextLoopTime: number;
    public deltaLoopTime: number;
    public keyboard:  { [key: string]: utils.IKeyboad };

    public gameElements: { [key: string]: any };

    private io: any;

    constructor() {
        this.canvas = document.getElementById("sgl") as HTMLCanvasElement;
        this.renderer = new PIXI.Application(800, 600, {
            backgroundColor : 0x1099bb,
            legacy: true,
            view: this.canvas,
        }, true);

        this.nextLoopTime = Date.now();
        this.gameElements = {};
        this.keyboard = {
            DOWN: utils.createKey(40),
            LEFT: utils.createKey(37),
            RIGHT: utils.createKey(39),
            UP: utils.createKey(38),
        };

        this.createSocket();

        this.create();
        this.runGameLoop();

        // let inputFPS = document.querySelector("#fps + button");
        // let callback = (e: any) => {
        //     console.log(e);
        // };
        // inputFPS.addEventListener("click", callback, false);
    }

    public get interval(): number {
        return 1000 / Game.FPS as number;
    }

    public getLatency(): void {
        this.io.emit("latency", {
            timestamp: Date.now()
        });
    }

    private createSocket(): void {
        this.io = io("http://localhost:9001");
        this.io.on("connect", () => {
            console.log("open");
        });
        this.io.on("message", (data: any) => {
            console.log(data);
        });
        this.io.on("latency", (data: any) => {
            this.gameElements.latency.text = "Latency: " + (data.timestamp - data.processed).toString();
        });
        this.io.on("disconnect", () => {
            console.log("closed");
        });
    }

    private create(): void {
        this.gameElements.box = utils.createBox(this.canvas.width / 2, this.canvas.height / 2, 20, 20);
        this.renderer.stage.addChild(this.gameElements.box);

        this.gameElements.latency = utils.createText(0, 20, "Latency: 0");
        this.gameElements.latency.x = this.canvas.width - this.gameElements.latency.width - 20;
        this.renderer.stage.addChild(this.gameElements.latency);

        setInterval(() => {
            this.getLatency();
        }, 500);

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
