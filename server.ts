import * as config from "./config";

import * as express from "express";
import * as logger from "morgan";
import * as path from "path";

const port: number = process.env.PORT || 9000;
const env: string = process.env.NODE_ENV || "development";

class Server {

    public express: express.Application;

    constructor(public config: any) {
        this.express = express();
        this.middleware();
        this.routes();
    }

    public start(): void {
        this.express.listen(this.config.NODE_PORT, () => {
            console.log(`Listening at :${this.config.NODE_PORT}/`);
        });
    }

    private middleware(): void {
        this.express.use(logger("dev"));
    }

    private routes(): void {
        const router = express.Router();
        router.get("/", this.main.bind(this));

        this.express.use("/", router);
        this.express.use("/static", express.static("dist"));
    }

    private main(req: express.Request, res: express.Response): void {
        res.sendFile(this.get_template("index.html"));
    }

    private get_template(template: string): string {
        return path.join(this.config.TEMPLATE_FOLDER, template);
    }
}

const server = new Server(config[env]);
server.start();
