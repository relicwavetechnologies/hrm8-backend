"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const public_controller_1 = require("./public.controller");
const router = (0, express_1.Router)();
const publicController = new public_controller_1.PublicController();
// Public Job Board Endpoints
router.get('/jobs/filters', publicController.getFilters);
router.get('/jobs/aggregations', publicController.getAggregations);
router.get('/jobs', publicController.getJobs);
router.get('/jobs/:id', publicController.getJobDetails);
router.get('/jobs/:id/related', publicController.getRelatedJobs);
router.get('/jobs/:jobId/application-form', publicController.getApplicationForm);
router.post('/jobs/:id/track', publicController.trackJobView);
// Public Application Endpoints
router.post('/applications/guest', publicController.submitGuestApplication);
exports.default = router;
