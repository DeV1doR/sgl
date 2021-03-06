import * as express from "express";
import * as http from "http";
import * as logger from "morgan";
import * as path from "path";
import * as io from "socket.io";

import * as config from "./config";

// hack for client code
(global as any).window = (global as any).document = global;
import { BaseCore, IPlayer, IInput, ILatency, IVector, ISnapshot, Direction, Vector, CreateBasePlayer, MessageQueue } from "./src/engine";

const env: string = process.env.NODE_ENV || "development";
const settings: any = config[env];
const nodePort: number = process.env.PORT || settings.NODE_PORT;
const socketPort: number = settings.SOCKET_PORT;
const clientPort: number = settings.GULP_PORT;
const allowedHosts = settings.ALLOWED_HOSTS.join(",") || "*";


class ServerEngine extends BaseCore {

    public io: any;

    public uid: number;
    public queue: MessageQueue<IInput>;
    public players: {[id: string]: IPlayer};
    public offline: {[id: string]: IPlayer};
    public fakeLatency: number;
    private initTime: number;
    private serverTime: number;

    constructor(frameTime: number) {
        super(frameTime);
        this.uid = 0;
        this.queue = new MessageQueue<IInput>(0, this.frameTime * 2);
        this.players = {};
        this.offline = {};
        this.fakeLatency = 0;
        this.initTime = Date.now();
        this.serverTime = 0.01;
    }

    public setSocket(io: any) {
        this.io = io;
    }

    public addPlayer(player: IPlayer): void {
        this.uid += 1;
        player.id = this.uid.toString();
        this.players[this.uid] = player;
    }

    public removePlayer(player: IPlayer): void {
        delete this.players[player.id];
        delete this.offline[player.id];
    }

    public update(): void {
        // 1) Process inputs
        this.processInputs();
        // 2) Send world state;
        this.sendWorldState();
    }

    public sendWorldState(): void {
        // send snapshot
        this.serverTime = Date.now();
        setTimeout(() => {
            this.io.emit("mapUpdate", <ISnapshot>{
                players: this.players,
                offline: Object.keys(this.offline).map((uid: string) => {
                    let player: IPlayer = this.offline[uid];
                    this.removePlayer(player);
                    return player;
                }),
                time: this.serverTime,
            });
        }, this.fakeLatency);
    }

    public processInputs(): void {
        while (true) {
            let input: IInput = this.queue.recv();
            if (!input) {
                break;
            }
            console.log(input);
            if (this.validateInput(input)) {
                let id: string = input.entityId;
                let player: IPlayer = this.players[id];
                if (player) {
                    this.applyInput(player, input);
                    player.lastInputTime = input.time;
                    player.lastInputSeq = input.seq;
                }
            }
        }
    }

    public validateInput(input: IInput): boolean {
        return true;
    }
}

class Server {

    public app: express.Application;
    private server: http.Server;
    private io: SocketIO.Server;
    private gameEngine: ServerEngine;

    constructor() {
        this.createApp();
        this.createServer();
        this.createSocket();
        this.middleware();
        this.routes();

        this.createEngine();
    }

    public listen(): void {
        console.log("Game loop started.");
        this.gameEngine.runLoop();
        this.server.listen(nodePort, () => console.log(`Listening at :${nodePort}/`));

        this.io.on("connect", (socket: SocketIO.Socket) => {
            console.log("Connected client on port %s.", socketPort);
            let player: IPlayer = CreateBasePlayer();
            this.gameEngine.addPlayer(player);

            socket.emit("registration", player);
            socket.emit("optionsUpdate", {
                TPS: this.gameEngine.frameTime,
                fakeLatency: this.gameEngine.fakeLatency,
            });

            socket.on("message", (data: any) => {
                console.log(`[server](message): ${data}`);
                this.io.emit("message", data);
            });

            socket.on("optionsUpdate", (data: any) => {
                if (data.TPS) {
                    this.gameEngine.frameTime = parseInt(data.TPS);
                    console.log("Changed TPS to ", this.gameEngine.frameTime);
                }
                if (data.fakeLatency) {
                    this.gameEngine.fakeLatency = parseInt(data.fakeLatency);
                    console.log("Changed fake latency to ", this.gameEngine.fakeLatency);
                }

                this.io.emit("optionsUpdate", {
                    TPS: this.gameEngine.frameTime,
                    fakeLatency: this.gameEngine.fakeLatency,
                });
            });

            socket.on("latency", (data: ILatency) => {
                let resp: ILatency = {
                    timestamp: Date.now(),
                    processed: data.timestamp,
                };
                socket.emit("latency", resp);
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected");
                this.gameEngine.offline[player.id] = player;
            });

            socket.on("input", (input: IInput) => {
                input.entityId = player.id;
                this.gameEngine.queue.send(input);
            })
        });
    }

    private createEngine(): void {
        this.gameEngine = new ServerEngine(60);
        this.gameEngine.setSocket(this.io);
        this.gameEngine.showTickRate = false;
    }

    private createApp(): void {
        this.app = express();
    }

    private createServer(): void {
        this.server = http.createServer(this.app);
    }

    private middleware(): void {
        this.app.use(logger("dev"));
        this.app.use((req: express.Request, res: express.Response, next: Function) => {
            res.header('Access-Control-Allow-Origin', `${allowedHosts}`);
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials");
            res.header("Access-Control-Allow-Credentials", "true");
            next();
        });
    }

    private createSocket(): void {
        this.io = io(this.server);
        this.io.attach(socketPort);
    }

    private routes(): void {
        const router = express.Router();
        router.get("/", this.main.bind(this));

        this.app.use("/", router);
        this.app.use("/static", express.static("dist"));
    }

    private main(req: express.Request, res: express.Response): void {
        res.sendFile(this.get_template("index.html"));
    }

    private get_template(template: string): string {
        return path.join(settings.TEMPLATE_FOLDER, template);
    }
}

const server = new Server();
server.listen();
