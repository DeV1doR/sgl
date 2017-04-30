import * as PIXI from "pixi.js";
import * as io from "socket.io-client";

import { BaseCore, IPlayer, IInput, IMap, Direction, CreateBasePlayer } from "./engine";
import { IKeyboad, createBox, createKey } from "./utils";

class ClientGame extends BaseCore {

    public canvas: HTMLCanvasElement;
    public renderer: PIXI.Application;

    public player: IPlayer;
    public players: {[id: string]: IPlayer};
    public clientPredict: boolean;
    public gameElements: { [key: string]: any };
    public keyboard:  { [direction: number]: IKeyboad };

    private io: any;

    constructor(frameTime: number) {
        super(frameTime);
        this.keyboard = {
            [Direction.Down]: createKey(40),
            [Direction.Left]: createKey(37),
            [Direction.Right]: createKey(39),
            [Direction.Up]: createKey(38),
        };
        this.canvas = document.getElementById("sgl") as HTMLCanvasElement;
        this.renderer = new PIXI.Application(800, 600, {
            backgroundColor : 0x1099bb,
            legacy: true,
            view: this.canvas,
        }, true);

        this.player = null;
        this.players = {};
        this.gameElements = {};
        this.clientPredict = false;
        this.showTickRate = false;

        this.createSocket();
        this.create();
        this.runLoop();
    }

    public update(): void {
        // 1) check syncs from server
        // TODO: this.checkSyncs();
        // 2) process user input
        this.handleInput(this.player);
        // 3) send input to server
        this.sendInputToServer();
        // 4) apply input localy
        if (this.clientPredict)
            this.updateLocalPosition();
        // 5) Collision check
        // TODO: this.checkCollision();
        // 6) rerender map
        this.renderer.render();
    }

    private sendInputToServer(): void {
        if (this.player === null) return;
        let last: IInput = this.player.inputs.pop();
        if (typeof last !== "undefined")
            this.io.emit("input", last);
    }

    private updateLocalPosition(): void {
    }

    public handleInput(player: any): void {
        if (this.player === null) return;
        let inputs: Direction[] = [];
        for (let direction in Object.keys(this.keyboard)) {
            if (this.keyboard[direction].isDown) {
                inputs.push(parseInt(direction));
            }
        }
        if (inputs.length > 0) {
            this.inputSeq += 1;
            player.inputs.push({
                seq: this.inputSeq,
                time: Math.floor(Date.now() / 1000),
                inputs: inputs,
            } as IInput);
        }
    }

    private createPlayer(player: IPlayer) {
        this.players[player.id] = player;
        this.players[player.id].canvasEl = createBox(player.pos.x, player.pos.y, 20, 20);
        this.renderer.stage.addChild(this.players[player.id].canvasEl);
        return this.players[player.id];
    }

    private removePlayer(player: IPlayer) {
        this.renderer.stage.removeChild(this.players[player.id].canvasEl);
        delete this.players[player.id]
    }

    private createSocket(): void {
        this.io = io("http://localhost:9001");
        this.io.on("connect", () => {
            Object.keys(this.players).forEach(uid => {
                let player: IPlayer = this.players[uid];
                this.removePlayer(player);
            });
            console.log("open");
        });
        this.io.on("message", (data: any) => {
            console.log(data);
        });
        this.io.on("login", (player: IPlayer) => {
            this.player = this.createPlayer(player);
        });
        this.io.on("logout", (player: IPlayer) => {
            this.removePlayer(player);
        });
        this.io.on("mapUpdate", (mapData: IMap) => {
            for (let playerUpd of mapData.players) {
                if (this.players.hasOwnProperty(playerUpd.id)) {
                    let player: IPlayer = this.players[playerUpd.id];
                    player.pos = playerUpd.pos;
                    player.canvasEl.x = player.pos.x;
                    player.canvasEl.y = player.pos.y;
                } else {
                    this.createPlayer(playerUpd);
                }
            }
            (window as any).testData = mapData;
        });
        this.io.on("disconnect", () => {
            console.log("closed");
        });
    }

    private create(): void {

    }
}

(window as any).MainGame = new ClientGame(60);
