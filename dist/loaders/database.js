"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const initDatabase = async () => {
    await prisma_1.prisma.$connect();
    logger_1.logger.info('Database connected via Prisma');
};
exports.initDatabase = initDatabase;
