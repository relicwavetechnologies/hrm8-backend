import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from '../modules/auth/auth.routes';
import companyRoutes from '../modules/company/company.routes';
import userRoutes from '../modules/user/user.routes';
import jobRoutes from '../modules/job/job.routes';
import candidateRoutes from '../modules/candidate/candidate.routes';
import consultantRoutes from '../modules/consultant/consultant.routes';
import salesRoutes from '../modules/sales/sales.routes';
import hrm8Routes from '../modules/hrm8/hrm8.routes';
import assessmentRoutes from '../modules/assessment/assessment.routes';
import applicationRoutes from '../modules/application/application.routes';
import communicationRoutes from '../modules/communication/communication.routes';
import publicRoutes from '../modules/public/public.routes';
import integrationRoutes from '../modules/integration/integration.routes';
import stripeRoutes from '../modules/stripe/stripe.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import interviewRoutes from '../modules/interview/interview.routes';
import offerRoutes from '../modules/offer/offer.routes';
import walletRoutes from '../modules/wallet/wallet.routes';
import subscriptionRoutes from '../modules/subscription/subscription.routes';
import resumeRoutes from '../modules/resume/resume.routes';
import consultant360Routes from '../modules/consultant360/consultant360.routes';
import adminBillingRoutes from '../modules/admin-billing/admin-billing.routes';
import { errorMiddleware } from '../middlewares/error.middleware';
import { loggingMiddleware } from '../middleware/logging.middleware';

const expressLoader = async (app: Application): Promise<void> => {
  app.use(express.json());
  app.use(cookieParser());

  // HTTP request logging
  app.use(loggingMiddleware);

  // CORS setup
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080,http://localhost:3000,http://localhost:5173';
  const corsOptions = {
    origin: frontendUrl.includes(',') ? frontendUrl.split(',').map(u => u.trim()) : frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  app.use(cors(corsOptions));

  // Register module routers
  app.use('/api/auth', authRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/employees', userRoutes); // Alias for frontend compatibility
  app.use('/api/jobs', jobRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/assessment', assessmentRoutes);
  app.use('/api/communication', communicationRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/integration', integrationRoutes);
  app.use('/api/integrations/stripe', stripeRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/interviews', interviewRoutes);
  app.use('/api/video-interviews', interviewRoutes); // Alias for legacy frontend support
  app.use('/api/offers', offerRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/candidate', candidateRoutes);
  app.use('/api/consultant', consultantRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/hrm8', hrm8Routes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/consultant360', consultant360Routes);
  app.use('/api/admin/billing', adminBillingRoutes);

  // Error middleware must be registered last
  app.use(errorMiddleware);
};

export default expressLoader;
