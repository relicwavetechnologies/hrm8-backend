"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleRepository = exports.ExampleRepository = void 0;
const crypto_1 = require("crypto");
const repository_1 = require("../../core/repository");
class ExampleRepository extends repository_1.BaseRepository {
    constructor() {
        super(...arguments);
        this.examples = [];
    }
    async create(payload) {
        const example = {
            id: (0, crypto_1.randomUUID)(),
            name: payload.name,
            description: payload.description,
            createdAt: new Date(),
        };
        this.examples.push(example);
        return example;
    }
    async findAll() {
        return this.examples;
    }
}
exports.ExampleRepository = ExampleRepository;
exports.exampleRepository = new ExampleRepository();
