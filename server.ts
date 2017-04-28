import * as config from "./config";

import * as express from "express";
import * as http from "http";
import * as logger from "morgan";
import * as path from "path";
import * as io from "socket.io";

const env: string = process.env.NODE_ENV || "development";
const settings: any = config[env];
const nodePort: number = process.env.PORT || settings.NODE_PORT;
const socketPort: number = settings.SOCKET_PORT;
const clientPort: number = settings.GULP_PORT;

class Server {

    public app: express.Application;
    private server: http.Server;
    private io: SocketIO.Server;

    constructor() {
        this.createApp();
        this.createServer();
        this.createSocket();
        this.middleware();
        this.routes();
    }

    public listen(): void {
        this.server.listen(nodePort, () => console.log(`Listening at :${nodePort}/`));

        this.io.on("connect", (socket: any) => {
            console.log("Connected client on port %s.", socketPort);
            socket.on("message", (data: any) => {
                console.log(`[server](message): ${data}`);
                this.io.emit("message", data);
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected");
            });

            socket.on("latency", (data: any) => {
                if (!data) return;
                socket.emit("latency", {
                    timestamp: Date.now(),
                    processed: data.timestamp,
                });
            });
        });
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
            res.header('Access-Control-Allow-Origin', `http://localhost:${clientPort}`);
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
