import * as path from "path";

const rootPath = path.normalize(__dirname + "/..");

const config: any = {
    development: {
        GULP_PORT: 4000,
        ALLOWED_HOSTS: [
            "http://localhost:4000"
        ],
        NODE_PORT: 9000,
        SOCKET_PORT: 9001,
        TEMPLATE_FOLDER: path.join(rootPath, "/templates/"),
    },
};

export = config;
