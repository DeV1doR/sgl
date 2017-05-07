import * as PIXI from "pixi.js";

(window as any).lastTime = 0;
window.requestAnimationFrame = window.requestAnimationFrame || ((callback: any) => {
    let currTime: number = Date.now(),
        timeToCall: number = Math.max(0, (window as any).frameTime - (currTime - (window as any).lastTime));
    let id = window.setTimeout(() => callback(currTime + timeToCall), timeToCall);
    (window as any).lastTime = currTime + timeToCall;
    return id;
});

export interface ISnapshot {
    players: {[uid: string]: IPlayer};
    offline: IPlayer[];
    time: number;
}

export interface IInput {
    seq: number;
    time: number;
    inputs: Direction[];
    entityId?: string;
}

export interface ILatency {
    timestamp: number;
    processed: number;
}

export interface IPlayer {
    id?: string;
    lastInputSeq: number;
    lastInputTime: number;
    canvasEl?: PIXI.Container;
    socket?: any;
    inputs: IInput[];
    prevPos: IVector;
    pos: IVector;
    speed: IVector;
}

export interface IVector {
    x: number;
    y: number;
}

export const enum Direction {
    Down,
    Left,
    Right,
    Up
}

export const CreateBasePlayer = (): IPlayer => {
    return {
        inputs: [],
        lastInputSeq: 0,
        lastInputTime: 0,
        prevPos: <IVector>{x: 0, y: 0},
        pos: <IVector>{x: 0, y: 0},
        speed: <IVector>{x: 5, y: 5},
    };
};

export class Vector implements IVector {

    constructor(public x: number, public y: number) {}

    public static copy(v: IVector): IVector {
        return <IVector>{x: v.x, y: v.y};
    }

    public static add(v1: IVector, v2: IVector): IVector {
        return <IVector>{
            x: parseInt((v1.x + v2.x).toFixed()),
            y: parseInt((v1.y + v2.y).toFixed()),
        }
    }

    public static lerp(v1: IVector, v2: IVector, t: number): IVector {
        t = Math.max(0, Math.min(1, t));
        return <IVector>{
            x: parseInt((v1.x + t * (v2.x - v1.x)).toFixed()),
            y: parseInt((v1.y + t * (v2.y - v1.y)).toFixed()),
        }
    }
}

export class IMessageQueue<T> {
    recvTs: number;
    payload: T;
}

export class MessageQueue<T> {

    public messages: IMessageQueue<T>[];

    constructor(public timeDelay: number = 0, public bufferSize: number) {
        this.messages = [];
    }

    public send(message: T): void {
        // limit buffer size
        if (this.length >= this.bufferSize) {
            this.messages.splice(0, 1);
            return;
        }
        this.messages.push({
            recvTs: Date.now() + this.timeDelay,
            payload: message,
        });
    }

    public recv(): T {
        let message: IMessageQueue<T> = this.messages.splice(0, 1)[0];
        if (typeof message !== "undefined") {
            return message.payload;
        }
        else {
            let now: number = Date.now();
            for (let i in this.messages) {
                let message = this.messages[i];
                if (message.recvTs <= now) {
                    this.messages.splice(parseInt(i), 1);
                    return message.payload;
                }
            }
        }
    }

    public get(index: number): T {
        if (index < 0) {
            index = this.messages.length + index;
        }
        let message: IMessageQueue<T> = this.messages[index];
        if (typeof message !== "undefined") {
            return message.payload;
        }
    }

    public get length(): number {
        return this.messages.length;
    }
}

export abstract class BaseCore {

    public updateId: number;
    public inputSeq: number;

    public nextLoopTime: number;
    public deltaLoopTime: number;
    public showTickRate: boolean;
    private tickRate: number;
    private lastRun: number;

    constructor(public frameTime: number) {
        this.nextLoopTime = Date.now();
        this.inputSeq = 0;
        this.lastRun = 0;
        this.showTickRate = false;
    }

    public runLoop(): void {
        const now: number = Date.now();
        this.updateId = requestAnimationFrame(this.runLoop.bind(this));

        this.deltaLoopTime = now - this.nextLoopTime;

        if (this.deltaLoopTime > this.interval) {
            this.update();
            this.nextLoopTime = now - (this.deltaLoopTime % this.interval);
        }
        this.tickRate = 1000 / (Date.now() - this.lastRun);
        this.lastRun = Date.now();

        if (this.showTickRate) {
            console.log(this.tickRate);
        }
    }

    public abstract update(): void;

    private get interval(): number {
        return 1000 / this.frameTime;
    }

    public applyInput(player: IPlayer, input: IInput): void {
        let vector: IVector = {x: 0, y: 0};
        //don't process ones we already have simulated locally
        if (input.seq > player.lastInputSeq) {
            for (let cmd of input.inputs) {
                switch (cmd) {
                    case Direction.Down:
                        vector.y += player.speed.y;
                        break;
                    case Direction.Left:
                        vector.x -= player.speed.x;
                        break;
                    case Direction.Right:
                        vector.x += player.speed.x;
                        break;                
                    case Direction.Up:
                        vector.y -= player.speed.y;
                        break;
                }
            }
        }
        if (!player.pos) {
            player.pos = vector;
        }
        player.prevPos = Vector.copy(player.pos);
        player.pos = Vector.add(player.pos, vector);
        // this._checkCollision(player);
    }
}
