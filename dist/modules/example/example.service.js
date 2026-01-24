"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleService = exports.ExampleService = void 0;
const service_1 = require("../../core/service");
const example_repository_1 = require("./example.repository");
class ExampleService extends service_1.BaseService {
    constructor(repository = example_repository_1.exampleRepository) {
        super();
        this.repository = repository;
    }
    createExample(payload) {
        return this.repository.create(payload);
    }
    getExamples() {
        return this.repository.findAll();
    }
}
exports.ExampleService = ExampleService;
exports.exampleService = new ExampleService();
