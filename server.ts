import * as express from "express";
import * as http from "http";
import * as logger from "morgan";
import * as path from "path";
import * as io from "socket.io";

import * as config from "./config";

// hack for client code
(global as any).window = (global as any).document = global;
import { BaseCore, IPlayer, IInput, IVector, IMap, Direction, Vector, CreateBasePlayer } from "./src/engine";

const env: string = process.env.NODE_ENV || "development";
const settings: any = config[env];
const nodePort: number = process.env.PORT || settings.NODE_PORT;
const socketPort: number = settings.SOCKET_PORT;
const clientPort: number = settings.GULP_PORT;
const allowedHosts = settings.ALLOWED_HOSTS.join(",") || "*";


class ServerEngine extends BaseCore {

    public uid: number;
    public playersToUpdate: IPlayer[];
    public players: {[id: string]: IPlayer};
    private initTime: number;

    constructor(frameTime: number, public io: SocketIO.Server) {
        super(frameTime);
        this.uid = 0;
        this.playersToUpdate = [];
        this.players = {};
        this.initTime = 0.01;
    }

    public addPlayer(player: IPlayer): void {
        this.uid += 1;
        player.id = this.uid.toString();
        this.players[this.uid] = player;
    }

    public removePlayer(player: IPlayer): void {
        delete this.players[player.id];
    }

    public update(): void {
        for (let player of this.playersToUpdate) {
            player.prevPos = <IVector>player.pos.copy();
            // 1) Process input
            let vector: IVector = this.processInput(player);
            player.pos.add(vector);
            player.inputs = [];
            // 2) Check collision
            // TODO: this.checkCollision(player);
        }
        this.playersToUpdate = [];
        // 3) Send update
        this.serverUpdate();
    }

    private processInput(player: IPlayer): IVector {
        let vector: IVector = Vector.create({x: 0, y: 0} as IVector);
        for (let input of player.inputs) {
            //don't process ones we already have simulated locally
            if (input.seq <= player.lastInputSeq)
                continue;
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

        if (player.inputs.length) {
            player.lastInputTime = player.inputs[player.inputs.length - 1].time;
            player.lastInputSeq = player.inputs[player.inputs.length - 1].seq;
        }
        return vector;
    }

    private serverUpdate(): void {
        // send snapshot
        this.io.emit("mapUpdate", <IMap>{
            players: Object.keys(this.players).map((uid) => this.players[uid]),
        });
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
            console.log("Connected client on port %s.");
            let player: IPlayer = CreateBasePlayer();
            this.gameEngine.addPlayer(player);

            socket.emit("login", player);

            socket.on("message", (data: any) => {
                console.log(`[server](message): ${data}`);
                this.io.emit("message", data);
            });

            socket.on("disconnect", () => {
                this.gameEngine.removePlayer(player);
                console.log("Client disconnected");

                this.io.sockets.emit("logout", player);
            });

            socket.on("latency", (data: any) => {
                if (!data) return;
                socket.emit("latency", {
                    timestamp: Date.now(),
                    processed: data.timestamp,
                });
            });

            socket.on("input", (input: IInput) => {
                player.inputs.push(input);
                this.gameEngine.playersToUpdate.push(player);
                console.log('Received input: ', input);
            })
        });
    }

    private createEngine(): void {
        this.gameEngine = new ServerEngine(30, this.io);
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
