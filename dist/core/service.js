"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const prisma_1 = require("../utils/prisma");
class BaseService {
    constructor() {
        this.prisma = prisma_1.prisma;
    }
}
exports.BaseService = BaseService;
