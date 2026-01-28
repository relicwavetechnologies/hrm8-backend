import { Router } from 'express';
import { InterviewController } from './interview.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new InterviewController();

router.use(authenticate);

router.post('/', controller.create);
router.get('/', controller.getInterviews);
router.post('/bulk/reschedule', controller.bulkReschedule);
router.post('/bulk/cancel', controller.bulkCancel);
router.get('/calendar/events', controller.getCalendarEvents);
router.get('/job/:jobId', controller.listByJob);
router.get('/:id', controller.getById);
router.patch('/:id/status', controller.updateStatus);
router.put('/:id/status', controller.updateStatus); // Alias for compatibility
router.post('/:id/feedback', controller.addFeedback);
router.put('/:id/reschedule', controller.rescheduleInterview);
router.put('/:id/cancel', controller.cancelInterview);
router.put('/:id/no-show', controller.markAsNoShow);

export default router;
