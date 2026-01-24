"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const prisma_1 = require("../utils/prisma");
class BaseRepository {
    constructor() {
        this.prisma = prisma_1.prisma;
    }
}
exports.BaseRepository = BaseRepository;
