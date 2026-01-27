import { Router } from 'express';
import { JobController } from './job.controller';
import { ApplicationFormController } from './application-form.controller';
import { JobDocumentController } from './job-document.controller';
import { AssessmentController } from '../assessment/assessment.controller';
import { InterviewController } from '../interview/interview.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const jobController = new JobController();
const applicationFormController = new ApplicationFormController();
const jobDocumentController = new JobDocumentController();
const assessmentController = new AssessmentController();
const interviewController = new InterviewController();

// Job CRUD
router.post('/', authenticate, jobController.createJob);
router.get('/', authenticate, jobController.getJobs);
router.post('/bulk-delete', authenticate, jobController.bulkDeleteJobs);
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
router.put('/:id/alerts', authenticate, jobController.updateAlerts);

// Hiring Team
router.post('/:id/hiring-team/invite', authenticate, jobController.inviteHiringTeamMember);

// Application Form
router.get('/:id/application-form', authenticate, applicationFormController.getApplicationForm);
router.put('/:id/application-form', authenticate, applicationFormController.updateApplicationForm);
router.post('/:id/application-form/generate-questions', authenticate, applicationFormController.generateQuestions);
router.post('/new/application-form/generate-questions', authenticate, applicationFormController.generateQuestions);

// AI & Documents
router.post('/parse-document', authenticate, jobDocumentController.parseDocument);
router.post('/generate-description', authenticate, jobController.generateDescription);

// Job Rounds Configuration (within Jobs context)
router.get('/:jobId/rounds/:roundId/assessment-config', authenticate, assessmentController.getAssessmentConfig);
router.get('/:jobId/rounds/:roundId/assessments', authenticate, assessmentController.getRoundAssessments);
router.post('/:jobId/rounds/:roundId/assessment-config', authenticate, assessmentController.configureAssessment);

router.get('/:jobId/rounds/:roundId/interview-config', authenticate, interviewController.getInterviewConfig);
router.post('/:jobId/rounds/:roundId/interview-config', authenticate, interviewController.configureInterview);

export default router;
