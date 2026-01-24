"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleController = void 0;
const api_response_1 = require("../../core/api-response");
const controller_1 = require("../../core/controller");
const example_service_1 = require("./example.service");
const create_example_dto_1 = require("./dto/create-example.dto");
class ExampleController extends controller_1.BaseController {
    constructor(service = example_service_1.exampleService) {
        super();
        this.service = service;
        this.createExample = async (req, res) => {
            const validated = create_example_dto_1.createExampleSchema.parse(req.body);
            const example = await this.service.createExample(validated);
            return res.json(api_response_1.ApiResponse.success(example, 'Example created'));
        };
        this.getExamples = async (_req, res) => {
            const examples = await this.service.getExamples();
            return res.json(api_response_1.ApiResponse.success(examples, 'Examples retrieved'));
        };
    }
}
exports.exampleController = new ExampleController();
