import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from '../modules/auth/auth.routes';
import companyRoutes from '../modules/company/company.routes';
import employeeRoutes from '../modules/employee/employee.routes';
import userRoutes from '../modules/user/user.routes';
import jobRoutes from '../modules/job/job.routes';
import candidateRoutes from '../modules/candidate/candidate.routes';
import consultantRoutes from '../modules/consultant/consultant.routes';
import salesRoutes from '../modules/sales/sales.routes';
import jobTemplateRoutes from '../modules/job-templates/job-templates.routes';
import emailTemplateRoutes from '../modules/email-templates/email-templates.routes';
import emailTriggersRoutes from '../modules/email-templates/email-triggers.routes';
import emailsRoutes from '../modules/email-templates/emails.routes';
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
import paymentRoutes from '../modules/payment/payment.routes';
import messagingRoutes from '../modules/messaging/messaging.routes';
import videoInterviewRoutes from '../modules/video-interviews/video-interviews.routes';
import talentPoolRoutes from '../modules/talent-pool/talent-pool.routes';
import departmentsRoutes from '../modules/departments/departments.routes';
import resumeRoutes from '../modules/resume/resume.routes';
import jobRoundRoutes from '../modules/job-rounds/job-rounds.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import adminRoutes from '../modules/admin/admin.routes';
import assessRoutes from '../modules/assess/assess.routes';
import conversationRoutes from '../modules/conversation/conversation.routes';
import consultant360Routes from '../modules/consultant360/consultant360.routes';
import consultant360V2Routes from '../modules/consultant-360/consultant-360.routes';
import employerRoutes from '../modules/employer/employer.routes';
import adminBillingRoutes from '../modules/admin-billing/admin-billing.routes';
import aiRoutes from '../modules/ai/ai.routes';
import hrm8EmailTemplateRoutes from '../modules/email/email-template.routes';
import { errorMiddleware } from '../middlewares/error.middleware';
import { env } from '../config/env';
import { loggingMiddleware } from '../middleware/logging.middleware';

const expressLoader = async (app: Application): Promise<void> => {
  app.use(express.json());
  app.use(cookieParser());

  // HTTP request logging
  app.use(loggingMiddleware);

  // CORS setup
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:8080,http://localhost:3000,http://localhost:5173';
  const allowedOrigins = frontendUrl.includes(',')
    ? frontendUrl.split(',').map((u) => u.trim())
    : [frontendUrl];

  const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'], // Expose pagination headers to frontend
  };

  console.log('[Express] CORS enabled for origins:', allowedOrigins);
  app.use(cors(corsOptions));

  // Register module routers
  app.use('/api/auth', authRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/employees', userRoutes); // Alias for frontend compatibility
  app.use('/api/jobs', jobRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/assessment', assessmentRoutes);
  app.use('/api/assessments', assessmentRoutes); // Plural alias for consistency
  app.use('/api/communication', communicationRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/integration', integrationRoutes); // Legacy alias
  app.use('/api/integrations', integrationRoutes);
  app.use('/api/integrations/stripe', stripeRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/candidate/notifications', notificationRoutes); // Candidate alias for notifications
  app.use('/api/interviews', interviewRoutes);
  app.use('/api/video-interviews', videoInterviewRoutes);
  app.use('/api/candidate/interviews', interviewRoutes); // Candidate alias for interviews
  app.use('/api/talent-pool', talentPoolRoutes);
  app.use('/api/departments', departmentsRoutes);
  app.use('/api/offers', offerRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/messages', messagingRoutes);
  app.use('/api/candidate/messages', messagingRoutes); // Candidate alias for messaging
  app.use('/api/candidate', candidateRoutes);
  app.use('/api/consultant', consultantRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/job-templates', jobTemplateRoutes);
  app.use('/api/hrm8', hrm8Routes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/job-rounds', jobRoundRoutes);
  app.use('/api/email-templates', emailTemplateRoutes);
  app.use('/api/email-triggers', emailTriggersRoutes);
  app.use('/api/emails', emailsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/assess', assessRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/consultant360', consultant360Routes);
  app.use('/api/consultant-360', consultant360V2Routes);
  app.use('/api/employer', employerRoutes);
  app.use('/api/admin/billing', adminBillingRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/hrm8/email-templates', hrm8EmailTemplateRoutes);

  // Error middleware must be registered last
  app.use(errorMiddleware);
};

export default expressLoader;
