import * as path from "path";

const rootPath = path.normalize(__dirname + "/..");

const config: any = {
    development: {
        GULP_PORT: 4000,
        NODE_PORT: 9000,
        TEMPLATE_FOLDER: path.join(rootPath, "/templates/"),
    },
};

export = config;
