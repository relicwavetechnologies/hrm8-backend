"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidate_controller_1 = require("./candidate.controller");
const candidate_messaging_controller_1 = require("./candidate-messaging.controller");
const candidate_offers_controller_1 = require("./candidate-offers.controller");
const candidate_jobs_controller_1 = require("./candidate-jobs.controller");
const candidate_applications_controller_1 = require("./candidate-applications.controller");
const candidate_documents_controller_1 = require("./candidate-documents.controller");
const notification_controller_1 = require("../notification/notification.controller");
const candidate_auth_middleware_1 = require("../../middlewares/candidate-auth.middleware");
const router = (0, express_1.Router)();
const candidateController = new candidate_controller_1.CandidateController();
const messagingController = new candidate_messaging_controller_1.CandidateMessagingController();
const offersController = new candidate_offers_controller_1.CandidateOffersController();
const jobsController = new candidate_jobs_controller_1.CandidateJobsController();
const applicationsController = new candidate_applications_controller_1.CandidateApplicationsController();
const documentsController = new candidate_documents_controller_1.CandidateDocumentsController();
const notificationController = new notification_controller_1.NotificationController();
// Auth
router.post('/auth/login', candidateController.login);
router.post('/auth/logout', candidateController.logout);
router.post('/auth/register', candidateController.register);
router.get('/auth/verify-email', candidateController.verifyEmail);
router.get('/auth/me', candidate_auth_middleware_1.authenticateCandidate, candidateController.getCurrentCandidate);
// Assessments
router.get('/assessments', candidate_auth_middleware_1.authenticateCandidate, candidateController.getAssessments);
router.get('/assessments/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.getAssessment);
router.post('/assessments/:id/start', candidate_auth_middleware_1.authenticateCandidate, candidateController.startAssessment);
router.post('/assessments/:id/submit', candidate_auth_middleware_1.authenticateCandidate, candidateController.submitAssessment);
// Messages
router.get('/messages/conversations', candidate_auth_middleware_1.authenticateCandidate, messagingController.getConversations);
router.get('/messages/conversations/:conversationId', candidate_auth_middleware_1.authenticateCandidate, messagingController.getConversation);
router.post('/messages/conversations', candidate_auth_middleware_1.authenticateCandidate, messagingController.createConversation);
router.post('/messages/send', candidate_auth_middleware_1.authenticateCandidate, messagingController.sendMessage);
router.put('/messages/conversations/:conversationId/read', candidate_auth_middleware_1.authenticateCandidate, messagingController.markAsRead);
router.post('/messages/conversations/:conversationId/archive', candidate_auth_middleware_1.authenticateCandidate, messagingController.archiveConversation);
router.post('/messages/conversations/:conversationId/close', candidate_auth_middleware_1.authenticateCandidate, messagingController.closeConversation);
// Jobs
router.get('/jobs', candidate_auth_middleware_1.authenticateCandidate, jobsController.listJobs);
router.get('/jobs/:id', candidate_auth_middleware_1.authenticateCandidate, jobsController.getJob);
router.post('/jobs/:id/apply', candidate_auth_middleware_1.authenticateCandidate, jobsController.applyJob);
router.post('/jobs/:id/save', candidate_auth_middleware_1.authenticateCandidate, jobsController.saveJob);
router.get('/jobs/search', candidate_auth_middleware_1.authenticateCandidate, jobsController.searchJobs);
// Recommended Jobs
router.get('/recommended-jobs', candidate_auth_middleware_1.authenticateCandidate, jobsController.getRecommendedJobs);
// Applications
router.get('/applications', candidate_auth_middleware_1.authenticateCandidate, applicationsController.listApplications);
router.get('/applications/:id', candidate_auth_middleware_1.authenticateCandidate, applicationsController.getApplicationStatus);
router.get('/applications/tracking', candidate_auth_middleware_1.authenticateCandidate, applicationsController.getApplicationTracking);
// Offers
router.get('/offers/:offerId', candidate_auth_middleware_1.authenticateCandidate, offersController.getOffer);
router.post('/offers/:offerId/accept', candidate_auth_middleware_1.authenticateCandidate, offersController.acceptOffer);
router.post('/offers/:offerId/decline', candidate_auth_middleware_1.authenticateCandidate, offersController.declineOffer);
router.post('/offers/:offerId/negotiations', candidate_auth_middleware_1.authenticateCandidate, offersController.initiateNegotiation);
router.post('/offers/:offerId/negotiations/:negotiationId/respond', candidate_auth_middleware_1.authenticateCandidate, offersController.respondToNegotiation);
router.post('/offers/:offerId/documents', candidate_auth_middleware_1.authenticateCandidate, offersController.uploadDocument);
router.get('/offers/:offerId/documents', candidate_auth_middleware_1.authenticateCandidate, offersController.getOfferDocuments);
router.get('/offers/:offerId/negotiations', candidate_auth_middleware_1.authenticateCandidate, offersController.getNegotiations);
// Profile
router.get('/profile', candidate_auth_middleware_1.authenticateCandidate, candidateController.getProfile);
router.put('/profile', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateProfile);
router.put('/profile/password', candidate_auth_middleware_1.authenticateCandidate, candidateController.updatePassword);
// Profile - Documents, Qualifications, Work History routes
router.get('/profile/documents', candidate_auth_middleware_1.authenticateCandidate, candidateController.getDocuments);
router.put('/profile/documents', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateDocuments);
router.get('/profile/qualifications', candidate_auth_middleware_1.authenticateCandidate, candidateController.getQualifications);
router.put('/profile/qualifications', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateQualifications);
router.get('/profile/work-history', candidate_auth_middleware_1.authenticateCandidate, candidateController.getWorkHistory);
router.post('/profile/work-history', candidate_auth_middleware_1.authenticateCandidate, candidateController.createWorkHistory);
router.put('/profile/work-history', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateWorkHistory);
router.put('/profile/work-history/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateWorkHistory);
router.delete('/profile/work-history/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.deleteWorkHistory);
// Shorthand routes (for backwards compatibility)
router.get('/work-history', candidate_auth_middleware_1.authenticateCandidate, candidateController.getWorkHistory);
router.post('/work-history', candidate_auth_middleware_1.authenticateCandidate, candidateController.createWorkHistory);
router.put('/work-history', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateWorkHistory);
router.put('/work-history/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateWorkHistory);
router.delete('/work-history/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.deleteWorkHistory);
router.get('/skills', candidate_auth_middleware_1.authenticateCandidate, candidateController.getSkills);
router.post('/skills', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateSkills);
router.put('/skills', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateSkills);
// Documents - Granular endpoints
// Resumes
router.get('/documents/resumes', candidate_auth_middleware_1.authenticateCandidate, documentsController.listResumes);
router.post('/documents/resumes', candidate_auth_middleware_1.authenticateCandidate, documentsController.uploadSingle, documentsController.uploadResume);
router.post('/resume/parse', candidate_auth_middleware_1.authenticateCandidate, documentsController.uploadResumeMiddleware, documentsController.parseResume);
router.put('/documents/resumes/:id/set-default', candidate_auth_middleware_1.authenticateCandidate, documentsController.setDefaultResume);
router.delete('/documents/resumes/:id', candidate_auth_middleware_1.authenticateCandidate, documentsController.deleteResume);
// Cover Letters
router.get('/documents/cover-letters', candidate_auth_middleware_1.authenticateCandidate, documentsController.listCoverLetters);
router.post('/documents/cover-letters', candidate_auth_middleware_1.authenticateCandidate, documentsController.uploadSingle, documentsController.createCoverLetter);
router.put('/documents/cover-letters/:id', candidate_auth_middleware_1.authenticateCandidate, documentsController.uploadSingle, documentsController.updateCoverLetter);
router.delete('/documents/cover-letters/:id', candidate_auth_middleware_1.authenticateCandidate, documentsController.deleteCoverLetter);
// Portfolio
router.get('/documents/portfolio', candidate_auth_middleware_1.authenticateCandidate, documentsController.listPortfolioItems);
router.post('/documents/portfolio', candidate_auth_middleware_1.authenticateCandidate, documentsController.uploadSingle, documentsController.createPortfolioItem);
router.put('/documents/portfolio/:id', candidate_auth_middleware_1.authenticateCandidate, documentsController.uploadSingle, documentsController.updatePortfolioItem);
router.delete('/documents/portfolio/:id', candidate_auth_middleware_1.authenticateCandidate, documentsController.deletePortfolioItem);
// Saved Jobs & Searches
router.get('/saved-jobs', candidate_auth_middleware_1.authenticateCandidate, candidateController.getSavedJobs);
router.delete('/saved-jobs/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.removeSavedJob);
router.get('/saved-searches', candidate_auth_middleware_1.authenticateCandidate, candidateController.getSavedSearches);
router.delete('/saved-searches/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.deleteSavedSearch);
router.get('/job-alerts', candidate_auth_middleware_1.authenticateCandidate, candidateController.getJobAlerts);
router.post('/job-alerts', candidate_auth_middleware_1.authenticateCandidate, candidateController.createJobAlert);
router.put('/job-alerts/:id', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateJobAlert);
router.delete('/job-alerts/:id', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.deleteJobAlert(req, res));
// Qualifications - Education
router.get('/qualifications/education', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.getEducation(req, res));
router.post('/qualifications/education', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.createEducation(req, res));
router.put('/qualifications/education/:id', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.updateEducation(req, res));
router.delete('/qualifications/education/:id', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.deleteEducation(req, res));
// Qualifications - Certifications
router.get('/qualifications/certifications', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.getCertifications(req, res));
router.get('/qualifications/certifications/expiring', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.getExpiringCertifications(req, res));
router.post('/qualifications/certifications', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.createCertification(req, res));
router.put('/qualifications/certifications/:id', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.updateCertification(req, res));
router.delete('/qualifications/certifications/:id', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.deleteCertification(req, res));
// Qualifications - Training
router.get('/qualifications/training', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.getTraining(req, res));
router.post('/qualifications/training', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.createTraining(req, res));
router.put('/qualifications/training/:id', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.updateTraining(req, res));
router.delete('/qualifications/training/:id', candidate_auth_middleware_1.authenticateCandidate, (req, res) => candidateController.deleteTraining(req, res));
// Notification Preferences
router.get('/notifications/preferences', candidate_auth_middleware_1.authenticateCandidate, candidateController.getNotificationPreferences);
router.put('/notifications/preferences', candidate_auth_middleware_1.authenticateCandidate, candidateController.updateNotificationPreferences);
// Notifications
router.get('/notifications', candidate_auth_middleware_1.authenticateCandidate, notificationController.list);
router.patch('/notifications/:id/read', candidate_auth_middleware_1.authenticateCandidate, notificationController.markRead);
router.patch('/notifications/read-all', candidate_auth_middleware_1.authenticateCandidate, notificationController.markAllRead);
exports.default = router;
