"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
const database_1 = require("./database");
const loaders = async () => {
    await (0, database_1.initDatabase)();
    const app = await (0, app_1.createApp)();
    return app;
};
exports.default = loaders;
