import * as PIXI from "pixi.js";
import * as io from "socket.io-client";

import { BaseCore, IPlayer, IInput, ISnapshot, Direction, CreateBasePlayer } from "./engine";
import { IKeyboad, createBox, createKey } from "./utils";

class ClientGame extends BaseCore {

    public canvas: HTMLCanvasElement;
    public renderer: PIXI.Application;

    public player: IPlayer;
    public players: {[id: string]: IPlayer};
    public clientPredict: boolean;
    public gameElements: { [key: string]: any };
    public messages: ISnapshot[];
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
        this.messages = [];
        this.clientPredict = false;
        this.showTickRate = false;

        this.createSocket();
        this.create();
        this.runLoop();
    }

    public update(): void {
        if (this.player === null) return;
        // 1) check syncs from server
        this.processServerMessages();
        // 2) process user input and send input to server
        this.handleInput(this.player);
        // 3) apply input localy
        this.updateLocalPosition();
        // 4) rerender map
        this.renderer.render();
    }

    public processServerMessages(): void {
        while (true) {
            let snapshot: ISnapshot = this.messages.pop();
            if (!snapshot) {
                break;
            }
            for (let playerData of snapshot.players) {
                if (this.players.hasOwnProperty(playerData.id)) {
                    let player: IPlayer = this.players[playerData.id];
                    player.pos = playerData.pos;
                    player.canvasEl.x = player.pos.x;
                    player.canvasEl.y = player.pos.y;
                    player.inputs = [];
                } else {
                    this.createPlayer(playerData);
                }
            }     
        }
    }

    public sendInputToServer(): void {
        if (this.player === null) return;
        let last: IInput = this.player.inputs.pop();
        if (typeof last !== "undefined")
            this.io.emit("input", last);
    }

    public updateLocalPosition(): void {
        if (!this.clientPredict) return;
        // this.checkCollision();
    }

    public handleInput(player: any): void {
        let inputs: Direction[] = [];
        for (let direction in Object.keys(this.keyboard)) {
            if (this.keyboard[direction].isDown) {
                inputs.push(parseInt(direction));
            }
        }
        if (inputs.length > 0) {
            this.inputSeq += 1;
            let packet: IInput = {
                seq: this.inputSeq,
                time: Math.floor(Date.now() / 1000),
                inputs: inputs,
            };
            // store for reapplying
            player.inputs.push(packet);
            // send packet to server
            this.io.emit("input", packet);
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
        this.io.on("mapUpdate", (snapshot: ISnapshot) => {
            this.messages.push(snapshot);
        });
        this.io.on("disconnect", () => {
            console.log("closed");
        });
    }

    private create(): void {

    }
}

(window as any).MainGame = new ClientGame(60);
