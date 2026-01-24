"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
const loaders_1 = __importDefault(require("./loaders"));
const logger_1 = require("./utils/logger");
const startServer = async () => {
    try {
        const app = await (0, loaders_1.default)();
        app.listen(config_1.default.PORT, () => {
            logger_1.logger.info(`🚀 Server running on port ${config_1.default.PORT}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', error);
        process.exit(1);
    }
};
void startServer();
