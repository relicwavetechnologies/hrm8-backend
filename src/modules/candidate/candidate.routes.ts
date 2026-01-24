import { Router } from 'express';
import { CandidateController } from './candidate.controller';
import { authenticateCandidate } from '../../middlewares/candidate-auth.middleware';

const router = Router();
const candidateController = new CandidateController();

// Auth
router.post('/auth/login', candidateController.login);
router.post('/auth/logout', candidateController.logout);
router.post('/auth/register', candidateController.register);

// Profile
router.get('/profile', authenticateCandidate, candidateController.getProfile);
router.put('/profile', authenticateCandidate, candidateController.updateProfile);
router.put('/profile/password', authenticateCandidate, candidateController.updatePassword);

export default router;
