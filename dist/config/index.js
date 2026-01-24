"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
const config = {
    PORT: env_1.PORT,
    NODE_ENV: env_1.NODE_ENV,
    DATABASE_URL: env_1.DATABASE_URL,
    JWT_SECRET: env_1.JWT_SECRET,
};
exports.default = config;
