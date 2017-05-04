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
    public fakeLatency: number;

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
        this.fakeLatency = 250;
        this.players = {};
        this.gameElements = {};
        this.clientPredict = false;
        this.serverReconciliation = false;
        this.showTickRate = false;
        this.queue = new MessageQueue<ISnapshot>();

        this.createSocket();
        this.create();
        this.runLoop();
        this.checkLatency();
        this.panelEvents();
    }

    public panelEvents(): void {
        const callback = (event: any) => {
            switch (event.target.id) {
                case "tps":
                    this.io.emit("optionsUpdate", {TPS: event.target.value});
                    break;
                case "latency":
                    this.io.emit("optionsUpdate", {fakeLatency: event.target.value});
                    break;
                case "fps":
                    this.frameTime = event.target.value;
                    event.target.parentElement.querySelector("label").innerHTML = `FPS=${this.frameTime}`;
                    break;
            }
        };
        for (let node of document.querySelectorAll('.input-bar-slider') as any) {
            node.addEventListener("change", callback);
            node.addEventListener("input", callback);
        }
        let latencyBlock: any = document.querySelector('#latency');
        latencyBlock.value = this.fakeLatency;
        latencyBlock.parentElement.querySelector("label").innerHTML = `Fake latency=${this.fakeLatency}`;

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
                    if (this._isUserPlayer(player)) {
                        this._playerPredictionCorrection(playerData);
                    } else {
                        player.prevPos = Vector.copy(player.pos);
                        player.pos = Vector.lerp(playerData.prevPos, playerData.pos, 0.1);
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
            setTimeout(() => this.io.emit("input", packet), this.fakeLatency);
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

    private _playerPredictionCorrection(playerData: IPlayer): void {
        this.player.pos = playerData.pos;
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
    }

    private _isUserPlayer(player: IPlayer): boolean {
        if (!this.player) {
            return false;
        }
        return this.player.id === player.id;
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
            this.io.emit("optionsUpdate", {fakeLatency: this.fakeLatency});
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
        this.io.on("optionsUpdate", (data: any) => {
            let tpsInput: any = document.querySelector('input#tps');
            tpsInput.value = data.TPS;
            tpsInput.parentElement.querySelector("label").innerHTML = `TPS=${data.TPS}`;

            let latencyInput: any = document.querySelector('input#latency');
            latencyInput.value = data.fakeLatency;
            latencyInput.parentElement.querySelector("label").innerHTML = `Fake latency=${data.fakeLatency}`;
            this.fakeLatency = data.fakeLatency;
        });
        this.io.on("latency", (data: any) => {
            let real: number = data.timestamp - data.processed;
            let fake: number = this.fakeLatency;
            let delta: number = real + fake;
            document.getElementById("real-latency").innerHTML = `Real latency: ${real}`;
            document.getElementById("fake-latency").innerHTML = `Fake latency: ${fake}`;
            document.getElementById("total-latency").innerHTML = `Total latency: ${delta}`;
        });
        this.io.on("disconnect", () => {
            console.log("closed");
        });
    }

    private create(): void {

    }
}

(window as any).MainGame = new ClientGame(60);
