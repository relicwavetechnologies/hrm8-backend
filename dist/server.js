"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
const loaders_1 = __importDefault(require("./loaders"));
const logger_1 = require("./utils/logger");
const server_1 = require("./websocket/server");
const url_1 = require("url");
const startServer = async () => {
    try {
        const app = await (0, loaders_1.default)();
        const server = app.listen(config_1.default.PORT, () => {
            // Server started
        });
        // Handle WebSocket upgrades
        server.on('upgrade', (request, socket, head) => {
            const { pathname } = (0, url_1.parse)(request.url || '', true);
            if (pathname === '/ws' || pathname === '/') {
                server_1.wss.handleUpgrade(request, socket, head, (ws) => {
                    server_1.wss.emit('connection', ws, request);
                });
            }
            else {
                socket.destroy();
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', error);
        process.exit(1);
    }
};
void startServer();
