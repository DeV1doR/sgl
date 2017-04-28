import * as path from 'path';
import * as express from 'express';
import * as logger from 'morgan';

const port: number = process.env.PORT || 9000;

class Server {

    public express: express.Application;

    constructor() {
        this.express = express();
        this.middleware();
        this.routes();
    }

    private middleware(): void {
        this.express.use(logger('dev'));
    }

    private routes(): void {
        let router = express.Router();
        router.get('/', this.main);

        this.express.use('/', router);
        this.express.use('/static', express.static('dist'));
    }

    private main(req: express.Request, res: express.Response): void {
        res.sendFile(path.join(__dirname + '/src/index.html'));
    }

    static listen(port: number): void {
        let server: Server = new Server();
        server.express.listen(port, () => {
            console.log(`Listening at :${port}/`);
        });
    }
}

Server.listen(port);