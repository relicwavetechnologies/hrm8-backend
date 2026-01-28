import { Router } from 'express';
import { AssessController } from './assess.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();
const assessController = new AssessController();

// Public routes (no auth required)
router.post('/register', assessController.registerAssessUser);
router.post('/login', assessController.loginAssessUser);
router.get('/job-options', assessController.getJobOptions);
router.post('/recommendations', assessController.getRecommendations);

// Protected routes (auth required)
router.use(authenticate);
router.get('/me', assessController.getAssessUser);
router.post('/logout', assessController.logoutAssessUser);

// Internal Job routes
router.post('/jobs', assessController.createInternalJob);
router.post('/jobs/upload-description', upload.single('file'), assessController.uploadPositionDescription);
router.get('/my-jobs', assessController.getMyJobs);
router.get('/jobs/:jobId', assessController.getJobWithCandidates);
router.post('/jobs/:jobId/candidates', assessController.addCandidateToJob);
router.post('/jobs/:jobId/candidates/move', assessController.moveCandidate);

// Credits & Balance
router.get('/balance', assessController.getCompanyBalance);
router.post('/test-credits', assessController.addTestCredits);

// Candidate CV
router.post('/upload-cv', upload.single('file'), assessController.uploadCandidateCV);

export default router;
