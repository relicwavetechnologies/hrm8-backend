"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offer_controller_1 = require("./offer.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const offerController = new offer_controller_1.OfferController();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.get('/application/:applicationId/workflow', auth_middleware_1.authenticate, offerController.getWorkflowByApplication);
router.put('/application/:applicationId/workflow', auth_middleware_1.authenticate, offerController.updateWorkflowByApplication);
router.post('/application/:applicationId/workflow/documents', auth_middleware_1.authenticate, upload.array('files'), offerController.uploadWorkflowDocuments);
router.post('/', auth_middleware_1.authenticate, offerController.create);
router.post('/:id/send', auth_middleware_1.authenticate, offerController.send);
router.get('/application/:applicationId', auth_middleware_1.authenticate, offerController.getByApplication);
router.get('/:id', auth_middleware_1.authenticate, offerController.getById);
router.patch('/:id', auth_middleware_1.authenticate, offerController.update);
router.post('/:id/accept', auth_middleware_1.authenticate, offerController.accept); // Auth needs to support candidates
router.post('/:id/decline', auth_middleware_1.authenticate, offerController.decline);
exports.default = router;
