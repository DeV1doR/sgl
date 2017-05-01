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
    players: IPlayer[];
}

export interface IInput {
    seq: number;
    time: number;
    inputs: Direction[];
    entityId?: string;
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
    copy(): IVector;
    add(v: IVector): void;
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
        prevPos: Vector.create({x: 0, y: 0} as IVector),
        pos: Vector.create({x: 0, y: 0} as IVector),
        speed: Vector.create({x: 5, y: 5} as IVector),
    };
};

export class Vector implements IVector {

    constructor(public x: number, public y: number) {}

    public copy(): IVector {
        return Vector.create(this);
    }

    public add(v: IVector): void {
        this.x = parseInt((this.x + v.x).toFixed());
        this.y = parseInt((this.y + v.y).toFixed());
    }

    public static create(v: IVector) {
        return new Vector(v.x, v.y);
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
}
