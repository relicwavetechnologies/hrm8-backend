import { ApplicationStage } from '@prisma/client';

export const JOBTARGET_GLOBAL_INTEGRATION_NAME = 'jobtarget_global';
export const JOBTARGET_COMPANY_LINK_NAME = 'jobtarget_company_link';

export const JOBTARGET_RETRY_DELAY_MINUTES = 10;

export const APPLICATION_STAGE_TO_JOBTARGET_STAGE: Record<ApplicationStage, { stage: string; substage?: string }> = {
  NEW_APPLICATION: { stage: 'New Application' },
  RESUME_REVIEW: { stage: 'Resume Review' },
  PHONE_SCREEN: { stage: 'Phone Screen' },
  TECHNICAL_INTERVIEW: { stage: 'Interview', substage: 'Technical Interview' },
  ONSITE_INTERVIEW: { stage: 'Interview', substage: 'Onsite Interview' },
  OFFER_EXTENDED: { stage: 'Offer', substage: 'Offer Extended' },
  OFFER_ACCEPTED: { stage: 'Hired' },
  REJECTED: { stage: 'Rejected' },
};

export type JobTargetAttribution = {
  applicantGuid?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  rawQuery?: Record<string, string>;
};
