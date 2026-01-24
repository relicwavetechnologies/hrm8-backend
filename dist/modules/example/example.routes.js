"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const example_controller_1 = require("./example.controller");
const router = (0, express_1.Router)();
router.post('/', example_controller_1.exampleController.createExample);
router.get('/', example_controller_1.exampleController.getExamples);
exports.default = router;
