"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offer_controller_1 = require("./offer.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const offerController = new offer_controller_1.OfferController();
router.post('/', auth_middleware_1.authenticate, offerController.create);
router.post('/:id/send', auth_middleware_1.authenticate, offerController.send);
router.get('/application/:applicationId', auth_middleware_1.authenticate, offerController.getByApplication);
router.get('/:id', auth_middleware_1.authenticate, offerController.getById);
router.patch('/:id', auth_middleware_1.authenticate, offerController.update);
router.post('/:id/accept', auth_middleware_1.authenticate, offerController.accept); // Auth needs to support candidates
router.post('/:id/decline', auth_middleware_1.authenticate, offerController.decline);
exports.default = router;
