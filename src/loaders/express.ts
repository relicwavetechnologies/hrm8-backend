import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from '../modules/auth/auth.routes';
import signupRequestRoutes from '../modules/auth/signup-request.routes';
import companyRoutes from '../modules/company/company.routes';
import userRoutes from '../modules/user/user.routes';
import jobRoutes from '../modules/job/job.routes';
import jobTemplateRoutes from '../modules/job/job-template.routes';
import screeningTemplateRoutes from '../modules/job/screening-template.routes';
import candidateRoutes from '../modules/candidate/candidate.routes';
import consultantRoutes from '../modules/consultant/consultant.routes';
import salesRoutes from '../modules/sales/sales.routes';
import hrm8Routes from '../modules/hrm8/hrm8.routes';
import assessmentRoutes from '../modules/assessment/assessment.routes';
import applicationRoutes from '../modules/application/application.routes';
import communicationRoutes from '../modules/communication/communication.routes';
import publicRoutes from '../modules/public/public.routes';
import integrationRoutes from '../modules/integration/integration.routes';
import googleOAuthRoutes from '../modules/integration/google-oauth.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import interviewRoutes from '../modules/interview/interview.routes';
import offerRoutes from '../modules/offer/offer.routes';
import walletRoutes from '../modules/wallet/wallet.routes';
import subscriptionRoutes from '../modules/subscription/subscription.routes';
import resumeRoutes from '../modules/resume/resume.routes';
import consultant360Routes from '../modules/consultant360/consultant360.routes';
import adminBillingRoutes from '../modules/admin-billing/admin-billing.routes';
import aiRoutes from '../modules/ai/ai.routes';
import assistantRoutes from '../modules/assistant/assistant.routes';
import emailTemplateRoutes from '../modules/email/email-template.routes';
import messagingRoutes from '../modules/messaging/messaging.routes';
import pricingRoutes from '../modules/pricing/pricing.routes';
import taskRoutes from '../modules/task/task.routes';
import talentPoolRoutes from '../modules/talent-pool/talent-pool.routes';
import documentHubRoutes from '../modules/document-hub/document-hub.routes';
import billingRoutes from '../modules/billing/billing.routes';
import payoutsRoutes from '../modules/payouts/payouts.routes';
import { errorMiddleware } from '../middlewares/error.middleware';
import { loggingMiddleware } from '../middleware/logging.middleware';

const expressLoader = async (app: Application): Promise<void> => {
  app.use(express.json());
  app.use(cookieParser());

  // HTTP request logging
  app.use(loggingMiddleware);

  // CORS setup
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080,http://localhost:3000,http://localhost:5173,https://hrm8-ats-frontend.vercel.app,https://hrm8-candidate-frontend.vercel.app,https://hrm8-admin-and-staff-frontend2.vercel.app,https://hrm8-ats-frontend-alpha.vercel.app,https://hrm8-candidate-frontend-kohl.vercel.app,https://hrm8-admin-and-staff-frontend-three.vercel.app';
  const allowedOrigins = frontendUrl.includes(',')
    ? frontendUrl.split(',').map(u => u.trim())
    : [frontendUrl]; // Ensure it's always an array for cors middleware

  const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));

  // Register module routers
  // Mount more-specific /api/auth/google BEFORE the generic /api/auth
  app.use('/api/auth/google', googleOAuthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/signup-requests', signupRequestRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/employees', userRoutes); // Alias for frontend compatibility
  app.use('/api/jobs', jobRoutes);
  app.use('/api/job-templates', jobTemplateRoutes);
  app.use('/api/screening-templates', screeningTemplateRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/application', applicationRoutes); // Compatibility alias
  app.use('/api/assessment', assessmentRoutes);
  app.use('/api/assessments', assessmentRoutes); // Plural alias for consistency
  app.use('/api/communication', communicationRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/integration', integrationRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/interviews', interviewRoutes);
  app.use('/api/video-interviews', interviewRoutes); // Alias for legacy frontend support
  app.use('/api/offers', offerRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/payouts', payoutsRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/subscription', subscriptionRoutes); // Alias for singular access
  app.use('/api/candidate', candidateRoutes);
  app.use('/api/consultant', consultantRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/hrm8', hrm8Routes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/consultant360', consultant360Routes);
  app.use('/api/admin/billing', adminBillingRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/assistant', assistantRoutes);
  app.use('/api/email-templates', emailTemplateRoutes);
  app.use('/api/messaging', messagingRoutes);
  app.use('/api/pricing', pricingRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/talent-pool', talentPoolRoutes);
  app.use('/api/document-hub', documentHubRoutes);

  // Serve uploaded files statically
  const pathModule = require('path');
  app.use('/uploads', require('express').static(pathModule.join(process.cwd(), 'uploads')));

  // Error middleware must be registered last
  app.use(errorMiddleware);
};

export default expressLoader;
