import { Router } from 'express';
import { JobController } from './job.controller';
import { RoundConfigController } from './round-config.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const jobController = new JobController();

router.post('/', authenticate, jobController.createJob);
router.get('/', authenticate, jobController.getJobs);
router.post('/bulk-delete', authenticate, jobController.bulkDeleteJobs);
router.get('/:id', authenticate, jobController.getJob);
router.post('/:id/publish', authenticate, jobController.publishJob);

// Round Email Config Routes
router.get('/:jobId/rounds/:roundId/email-config', authenticate, RoundConfigController.getEmailConfig);
router.put('/:jobId/rounds/:roundId/email-config', authenticate, RoundConfigController.updateEmailConfig);

router.post('/:id/save-draft', authenticate, jobController.saveDraft);
router.post('/:id/save-template', authenticate, jobController.saveTemplate);
router.put('/:id', authenticate, jobController.updateJob);
router.delete('/:id', authenticate, jobController.deleteJob);

// Job Rounds
router.get('/:id/rounds', authenticate, jobController.getJobRounds);
router.post('/:id/rounds', authenticate, jobController.createJobRound);
router.put('/:id/rounds/:roundId', authenticate, jobController.updateJobRound);
router.delete('/:id/rounds/:roundId', authenticate, jobController.deleteJobRound);

// Interview Configuration
router.get('/:id/rounds/:roundId/interview-config', authenticate, jobController.getInterviewConfig);
router.post('/:id/rounds/:roundId/interview-config', authenticate, jobController.configureInterview);

// Assessment Configuration
router.get('/:id/rounds/:roundId/assessment-config', authenticate, jobController.getAssessmentConfig);
router.post('/:id/rounds/:roundId/assessment-config', authenticate, jobController.configureAssessment);
router.get('/:id/rounds/:roundId/assessments', authenticate, jobController.getRoundAssessments);

// Hiring Team
router.post('/:id/hiring-team/invite', authenticate, jobController.inviteHiringTeamMember);

export default router;
