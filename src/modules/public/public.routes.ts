import { Router } from 'express';
import multer from 'multer';
import { PublicController } from './public.controller';

const router = Router();
const publicController = new PublicController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Public Careers/Company Endpoints
router.get('/companies', publicController.getCompanies);
router.get('/companies/:id', publicController.getCompanyDetails);
router.get('/companies/:id/jobs', publicController.getCompanyJobs);

// Public Job Board Endpoints
router.get('/jobs/filters', publicController.getFilters);
router.get('/jobs/aggregations', publicController.getAggregations);
router.get('/jobs', publicController.getJobs);
router.get('/jobs/:id', publicController.getJobDetails);
router.get('/jobs/:id/related', publicController.getRelatedJobs);
router.get('/jobs/:jobId/application-form', publicController.getApplicationForm);
router.post('/jobs/:id/track', publicController.trackJobView);

// Public Application Endpoints
router.post(
  '/applications/guest',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'cover_letter', maxCount: 1 },
    { name: 'portfolio', maxCount: 1 },
  ]),
  publicController.submitGuestApplication
);

export default router;
