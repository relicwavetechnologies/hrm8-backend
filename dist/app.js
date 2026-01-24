"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("./config"));
const express_2 = __importDefault(require("./loaders/express"));
const logger_1 = require("./utils/logger");
const createApp = async () => {
    const app = (0, express_1.default)();
    await (0, express_2.default)(app);
    logger_1.logger.info(`Express initialized in ${config_1.default.NODE_ENV} mode`);
    return app;
};
exports.createApp = createApp;
