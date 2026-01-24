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
import communicationRoutes from '../modules/communication/communication.routes';
import publicRoutes from '../modules/public/public.routes';
import integrationRoutes from '../modules/integration/integration.routes';
import { errorMiddleware } from '../middlewares/error.middleware';

const expressLoader = async (app: Application): Promise<void> => {
  app.use(express.json());
  app.use(cookieParser());

  // CORS setup
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
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
  app.use('/api/jobs', jobRoutes);
  app.use('/api/assessment', assessmentRoutes);
  app.use('/api/communication', communicationRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/integration', integrationRoutes);
  app.use('/api/candidate', candidateRoutes);
  app.use('/api/consultant', consultantRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/hrm8', hrm8Routes);

  // Error middleware must be registered last
  app.use(errorMiddleware);
};

export default expressLoader;
