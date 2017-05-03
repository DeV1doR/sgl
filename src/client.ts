import * as PIXI from "pixi.js";
import * as io from "socket.io-client";

import { BaseCore, IPlayer, IInput, ILatency, ISnapshot, Direction, CreateBasePlayer, MessageQueue, Vector } from "./engine";
import { IKeyboad, createBox, createKey } from "./utils";

class ClientGame extends BaseCore {

    public canvas: HTMLCanvasElement;
    public renderer: PIXI.Application;

    public queue: MessageQueue<ISnapshot>;
    public player: IPlayer;
    public players: {[id: string]: IPlayer};
    public clientPredict: boolean;
    public serverReconciliation: boolean;
    public gameElements: { [key: string]: any };
    public keyboard: { [direction: number]: IKeyboad };
    public timeDelay: number;

    private latencyBlock: HTMLElement;
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
        this.timeDelay = 250;
        this.players = {};
        this.gameElements = {};
        this.clientPredict = false;
        this.serverReconciliation = false;
        this.showTickRate = false;
        this.queue = new MessageQueue<ISnapshot>();
        this.latencyBlock = document.getElementById("latency");

        this.createSocket();
        this.create();
        this.runLoop();
        this.checkLatency();
        this.panelEvents();
    }

    public panelEvents(): void {
        let nodes: NodeList = document.querySelectorAll(".number-spinner button");
        for (let i = 0; i < nodes.length; i++) {
            let node: Node = nodes[i];
            let callback = (event: any) => {
                let input: any = event.target.closest(".number-spinner").querySelector("input");
                let data: any = (node as any).dataset;
                let oldValue: number = parseInt(input.value.trim());
                let value: number;
                if (isNaN(value)) {
                    value = 1;
                }
                if (data.dir == "up") {
                    value = oldValue + 1;
                } else {
                    if (oldValue > 1) {
                        value = oldValue - 1;
                    } else {
                        value = 1;
                    }
                }
                input.value = value;
                switch (input.id) {
                    case "tps":
                        this.io.emit("changeTPS", {frameTime: value});
                        break;
                    case "fps":
                        this.frameTime = value;
                        break;
                }
            };
            node.addEventListener("click", callback);
        }
        let inputs: NodeList = document.querySelectorAll(".number-spinner input");
        for (let i = 0; i < inputs.length; i++) {
            let input: any = inputs[i];
            input.addEventListener("keydown", (event: any) => {
                let value: number = parseInt(input.value.trim());
                if (isNaN(value)) {
                    value = 1;
                }
                switch (input.id) {
                    case "tps":
                        this.io.emit("changeTPS", {frameTime: value});
                        break;
                    case "fps":
                        this.frameTime = value;
                        break;
                }
                console.log(value);
            });
        }
        document.querySelector("#client-prediction").addEventListener("click", (event: any) => {
            this.clientPredict = (this.clientPredict) ? false: true;
        });
        document.querySelector("#server-reconciliation").addEventListener("click", (event: any) => {
            this.serverReconciliation = (this.serverReconciliation) ? false: true;
        });
        document.querySelector("#extrapolation").addEventListener("click", (event: any) => {
            // TODO
        });
    }

    public checkLatency(): void {
        setInterval(() => {
            this.io.emit("latency", <ILatency>{timestamp: Date.now()});
        }, 1000);
    }

    public update(): void {
        if (this.player === null) return;
        // 1) check syncs from server
        this.processServerMessages();
        // 2) process user input and send input to server
        this.handleInputs();
        // 3) rerender map
        this.render();
    }

    public processServerMessages(): void {
        while (true) {
            let snapshot: ISnapshot = this.queue.recv();
            if (!snapshot) {
                break;
            }
            for (let playerData of snapshot.online) {
                if (this.players.hasOwnProperty(playerData.id)) {
                    let player: IPlayer = this.players[playerData.id];
                    player.pos = playerData.pos;
                    if (this.player.id === player.id) {
                        if (this.serverReconciliation) {
                            let i: number = 0;
                            while (i < this.player.inputs.length) {
                                let input: IInput = this.player.inputs[i];
                                // if already processed from server, remove input
                                if (input.seq <= playerData.lastInputSeq) {
                                    this.player.inputs.splice(i, 1);
                                // reapply it, don't wait server response
                                } else {
                                    this.applyInput(this.player, input);
                                    i++;
                                }
                            }
                        } else {
                            // no prediction, wait for server
                            this.player.inputs = [];
                        }
                    } else {
                        // player.pos = Vector.lerp(player.prevPos, playerData.prevPos, 0.01);
                        // player.prevPos = player.pos;
                    }
                } else {
                    this._createPlayer(playerData);
                }
            };
            for (let playerData of snapshot.offline) {
                this._removePlayer(this.players[playerData.id]);
            }
        }
    }

    public handleInputs(): void {
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
            this.player.inputs.push(packet);
            // send packet to server
            setTimeout(() => this.io.emit("input", packet), this.timeDelay);
            // apply local change
            if (this.clientPredict) {
                this.applyInput(this.player, packet);
            }
        }
    }

    public render(): void {
        Object.keys(this.players).forEach(uid => {
            let player: IPlayer = this.players[uid];
            player.canvasEl.position.set(
                player.pos.x - 0.5 * player.canvasEl.width - 1,
                player.pos.y - 0.5 * player.canvasEl.height - 1
            );
        });
        this.renderer.render();      
    }

    private _createPlayer(player: IPlayer): IPlayer {
        if (!this.players.hasOwnProperty(player.id)) {
            this.players[player.id] = player;
            this.players[player.id].canvasEl = createBox(player.pos.x, player.pos.y, 20, 20);
            this.renderer.stage.addChild(this.players[player.id].canvasEl);
        }
        return this.players[player.id];
    }

    private _removePlayer(player: IPlayer): void {
        if (!this.players.hasOwnProperty(player.id)) return;
        this.players[player.id].canvasEl.destroy();
        delete this.players[player.id];
    }

    private _clearPlayers(): void {
        Object.keys(this.players).forEach(uid => {
            let player: IPlayer = this.players[uid];
            this._removePlayer(player);
        });
    }

    private createSocket(): void {
        this.io = io("http://localhost:9001");
        this.io.on("connect", () => {
            this._clearPlayers();
            console.log("open");
        });
        this.io.on("message", (data: any) => {
            console.log(data);
        });
        this.io.on("registration", (player: IPlayer) => {
            this.player = this._createPlayer(player);
        });
        this.io.on("mapUpdate", (snapshot: ISnapshot) => {
            this.queue.send(snapshot);
        });
        this.io.on("latency", (data: any) => {
            let delta: number = data.timestamp - data.processed + this.timeDelay;
            this.latencyBlock.innerHTML = `Latency: ${delta}`;
        });
        this.io.on("disconnect", () => {
            console.log("closed");
        });
    }

    private create(): void {

    }
}

(window as any).MainGame = new ClientGame(60);
