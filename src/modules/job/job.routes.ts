import { Router } from 'express';
import { JobController } from './job.controller';
import { RoundConfigController } from './round-config.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import multer from 'multer';
import { jobDocumentController } from './job-document.controller';

const router = Router();
const jobController = new JobController();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticate, jobController.createJob as any as any);
router.post('/generate-description', authenticate, jobController.generateDescription as any as any);
router.post('/parse-document', authenticate, upload.single('file'), jobDocumentController.parseDocument as any as any);
router.get('/', authenticate, jobController.getJobs as any as any);
router.post('/bulk-delete', authenticate, jobController.bulkDeleteJobs as any as any);
router.post('/bulk-archive', authenticate, jobController.bulkArchiveJobs as any as any);
router.post('/bulk-unarchive', authenticate, jobController.bulkUnarchiveJobs as any as any);
router.get('/:id', authenticate, jobController.getJob as any as any);
router.post('/:id/publish', authenticate, jobController.publishJob as any as any);

// Round Email Config Routes
router.get('/:jobId/rounds/:roundId/email-config', authenticate, RoundConfigController.getEmailConfig as any as any);
router.put('/:jobId/rounds/:roundId/email-config', authenticate, RoundConfigController.updateEmailConfig as any as any);

// Round Offer Config Routes
router.get('/:jobId/rounds/:roundId/offer-config', authenticate, RoundConfigController.getOfferConfig as any as any);
router.put('/:jobId/rounds/:roundId/offer-config', authenticate, RoundConfigController.updateOfferConfig as any as any);

router.post('/:id/save-draft', authenticate, jobController.saveDraft as any as any);
router.post('/:id/save-template', authenticate, jobController.saveTemplate as any as any);
router.post('/:id/save-as-template', authenticate, jobController.saveAsTemplate as any as any);
router.post('/:id/archive', authenticate, jobController.archiveJob as any as any);
router.post('/:id/unarchive', authenticate, jobController.unarchiveJob as any as any);
router.put('/:id/alerts', authenticate, jobController.updateAlerts as any as any);
router.put('/:id', authenticate, jobController.updateJob as any as any);
router.delete('/:id', authenticate, jobController.deleteJob as any as any);

// Job Rounds
router.get('/:id/rounds', authenticate, jobController.getJobRounds as any as any);
router.post('/:id/rounds', authenticate, jobController.createJobRound as any as any);
router.put('/:id/rounds/:roundId', authenticate, jobController.updateJobRound as any as any);
router.delete('/:id/rounds/:roundId', authenticate, jobController.deleteJobRound as any as any);

// Interview Configuration
router.get('/:id/rounds/:roundId/interview-config', authenticate, jobController.getInterviewConfig as any as any);
router.post('/:id/rounds/:roundId/interview-config', authenticate, jobController.configureInterview as any as any);

// Assessment Configuration
router.get('/:id/rounds/:roundId/assessment-config', authenticate, jobController.getAssessmentConfig as any as any);
router.post('/:id/rounds/:roundId/assessment-config', authenticate, jobController.configureAssessment as any as any);
router.get('/:id/rounds/:roundId/assessments', authenticate, jobController.getRoundAssessments as any as any);

// Job Roles (per-job, for post-job setup)
router.get('/:id/roles', authenticate, jobController.getJobRoles as any as any);
router.post('/:id/roles', authenticate, jobController.createJobRole as any as any);

// Hiring Team
router.post('/:id/hiring-team/invite', authenticate, jobController.inviteHiringTeamMember as any as any); // Legacy?
router.get('/:id/team', authenticate, jobController.getHiringTeam as any as any);
router.post('/:id/team', authenticate, jobController.inviteHiringTeamMember as any as any);
router.patch('/:id/team/:memberId', authenticate, jobController.updateHiringTeamMemberRole as any as any);
router.delete('/:id/team/:memberId', authenticate, jobController.removeHiringTeamMember as any as any);
router.post('/:id/team/:memberId/resend-invite', authenticate, jobController.resendHiringTeamInvite as any as any);

export default router;
