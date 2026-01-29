import { Router } from 'express';
import { JobController } from './job.controller';
import { ApplicationFormController } from './application-form.controller';
import { JobDocumentController } from './job-document.controller';
import { AssessmentController } from '../assessment/assessment.controller';
import { InterviewController } from '../interview/interview.controller';
import { JobRoundController } from '../job-rounds/job-rounds.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const jobController = new JobController();
const applicationFormController = new ApplicationFormController();
const jobDocumentController = new JobDocumentController();
const assessmentController = new AssessmentController();
const interviewController = new InterviewController();
const jobRoundController = new JobRoundController();

// Job CRUD
router.post('/', authenticate, jobController.createJob);
router.get('/', authenticate, jobController.getJobs);
router.post('/bulk-delete', authenticate, jobController.bulkDeleteJobs);
router.post('/bulk-archive', authenticate, jobController.bulkArchiveJobs);
router.post('/bulk-unarchive', authenticate, jobController.bulkUnarchiveJobs);

router.post('/validate', authenticate, jobController.validateJob);
router.get('/:id', authenticate, jobController.getJob);
router.put('/:id', authenticate, jobController.updateJob);
router.delete('/:id', authenticate, jobController.deleteJob);

// Job Actions
router.post('/:id/publish', authenticate, jobController.publishJob);
router.post('/:id/save-draft', authenticate, jobController.saveDraft);
router.post('/:id/save-template', authenticate, jobController.saveTemplate);
router.post('/:id/save-as-template', authenticate, jobController.saveTemplate);
router.post('/:id/submit', authenticate, jobController.submitAndActivate);

router.post('/:id/create-payment', authenticate, jobController.createJobPayment);

// Lifecycle
router.post('/:id/clone', authenticate, jobController.cloneJob);
router.post('/:id/close', authenticate, jobController.closeJob);
router.post('/:id/archive', authenticate, jobController.archiveJob);
router.post('/:id/unarchive', authenticate, jobController.unarchiveJob);
router.get('/:id/activities', authenticate, jobController.getJobActivities);
router.put('/:id/alerts', authenticate, jobController.updateAlerts);

// Distribution
router.get('/:id/distribution', authenticate, jobController.getDistributionChannels);
router.put('/:id/distribution', authenticate, jobController.updateDistributionChannels);

// Hiring Team
router.post('/:id/hiring-team/invite', authenticate, jobController.inviteHiringTeamMember);
router.get('/:id/hiring-team', authenticate, jobController.getHiringTeam);
router.delete('/:id/hiring-team/:userId', authenticate, jobController.removeHiringTeamMember);

// Application Form
router.get('/:id/application-form', authenticate, applicationFormController.getApplicationForm);
router.put('/:id/application-form', authenticate, applicationFormController.updateApplicationForm);
router.post('/:id/application-form/generate-questions', authenticate, applicationFormController.generateQuestions);
router.post('/new/application-form/generate-questions', authenticate, applicationFormController.generateQuestions);

// AI & Documents
router.post('/parse-document', authenticate, jobDocumentController.parseDocument);
router.post('/generate-description', authenticate, jobController.generateDescription);

// Job Rounds Management
router.get('/:jobId/rounds', authenticate, jobRoundController.getJobRounds);
router.post('/:jobId/rounds', authenticate, jobRoundController.createRound);
router.put('/:jobId/rounds/:id', authenticate, jobRoundController.updateRound);
router.delete('/:jobId/rounds/:id', authenticate, jobRoundController.deleteRound);

// Job Rounds Configuration (within Jobs context)
router.get('/:jobId/rounds/:roundId/assessment-config', authenticate, assessmentController.getAssessmentConfig);
router.get('/:jobId/rounds/:roundId/assessments', authenticate, assessmentController.getRoundAssessments);
router.post('/:jobId/rounds/:roundId/assessment-config', authenticate, assessmentController.configureAssessment);

// Interview Configuration
// router.get('/:jobId/rounds/:roundId/interview-config', authenticate, interviewController.getInterviewConfig);
// router.post('/:jobId/rounds/:roundId/interview-config', authenticate, interviewController.configureInterview);

export default router;
