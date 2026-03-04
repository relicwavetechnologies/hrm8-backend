-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('PICKED_UP', 'BUSY', 'NO_ANSWER', 'LEFT_VOICEMAIL', 'WRONG_NUMBER', 'SCHEDULED_CALLBACK');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommissionStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "CommissionStatus" ADD VALUE 'CLAWBACK';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailStatus" ADD VALUE 'PENDING';
ALTER TYPE "EmailStatus" ADD VALUE 'CLICKED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HiringTeamRole" ADD VALUE 'HIRING_MANAGER';
ALTER TYPE "HiringTeamRole" ADD VALUE 'RECRUITER';
ALTER TYPE "HiringTeamRole" ADD VALUE 'INTERVIEWER';
ALTER TYPE "HiringTeamRole" ADD VALUE 'COORDINATOR';
ALTER TYPE "HiringTeamRole" ADD VALUE 'APPROVER';

-- AlterEnum
ALTER TYPE "JobRoundType" ADD VALUE 'CUSTOM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionPlanType" ADD VALUE 'PAYG';
ALTER TYPE "SubscriptionPlanType" ADD VALUE 'SMALL';
ALTER TYPE "SubscriptionPlanType" ADD VALUE 'MEDIUM';
ALTER TYPE "SubscriptionPlanType" ADD VALUE 'LARGE';
ALTER TYPE "SubscriptionPlanType" ADD VALUE 'RPO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VirtualTransactionType" ADD VALUE 'COMMISSION_CLAWBACK';
ALTER TYPE "VirtualTransactionType" ADD VALUE 'COMMISSION_ADJUSTMENT';

-- AlterTable
ALTER TABLE "AssessmentConfiguration" ADD COLUMN     "evaluation_mode" TEXT DEFAULT 'GRADING',
ADD COLUMN     "min_approvals_count" INTEGER,
ADD COLUMN     "voting_rule" TEXT;

-- AlterTable
ALTER TABLE "AssessmentGrade" ADD COLUMN     "vote" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "billing_currency" TEXT DEFAULT 'USD',
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency_locked_at" TIMESTAMP(3),
ADD COLUMN     "pricing_peg" TEXT DEFAULT 'USD',
ADD COLUMN     "region_code" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "draft_step" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "experience_level" TEXT,
ADD COLUMN     "hide_salary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price_book_id" TEXT,
ADD COLUMN     "price_book_version" TEXT,
ADD COLUMN     "pricing_peg" TEXT,
ADD COLUMN     "salary_period" TEXT,
ADD COLUMN     "setup_complete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "JobRound" ADD COLUMN     "autoMoveOnPass" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncPermissions" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "JobTemplate" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "PriceBook" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "billing_currency" TEXT,
ADD COLUMN     "effective_from" TIMESTAMP(3),
ADD COLUMN     "effective_to" TIMESTAMP(3),
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricing_peg" TEXT,
ADD COLUMN     "version" TEXT;

-- AlterTable
ALTER TABLE "PriceTier" ADD COLUMN     "band_name" TEXT,
ADD COLUMN     "salary_band_max" DECIMAL(12,2),
ADD COLUMN     "salary_band_min" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "RegionalRevenue" ADD COLUMN     "payment_reference" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "price_book_id" TEXT,
ADD COLUMN     "price_book_version" TEXT,
ADD COLUMN     "pricing_peg" TEXT;

-- AlterTable
ALTER TABLE "job_hiring_team_member" ADD COLUMN     "permissions" JSONB,
ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "lead_conversion_requests" ADD COLUMN     "intent_snapshot" JSONB;

-- AlterTable
ALTER TABLE "virtual_transactions" ADD COLUMN     "billing_currency_used" TEXT,
ADD COLUMN     "override_id" TEXT,
ADD COLUMN     "price_book_id" TEXT,
ADD COLUMN     "price_book_version" TEXT,
ADD COLUMN     "pricing_peg_used" TEXT;

-- CreateTable
CREATE TABLE "ApplicationTask" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "type" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewNote" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentVote" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "call_date" TIMESTAMP(3) NOT NULL,
    "outcome" "CallOutcome" NOT NULL,
    "phone_number" TEXT,
    "duration" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "template_id" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackLog" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipient_ids" TEXT[],
    "message" TEXT NOT NULL,
    "channel_id" TEXT,
    "thread_ts" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "to_number" TEXT NOT NULL,
    "from_number" TEXT,
    "message" TEXT NOT NULL,
    "status" "SmsStatus" NOT NULL DEFAULT 'PENDING',
    "twilio_sid" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_pricing_map" (
    "id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "pricing_peg" TEXT NOT NULL,
    "billing_currency" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_pricing_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_override" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "pricing_peg" TEXT,
    "billing_currency" TEXT,
    "price_book_id" TEXT,
    "scope" TEXT[],
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "questions" JSONB NOT NULL,
    "company_id" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_documents" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_by" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationTask_application_id_idx" ON "ApplicationTask"("application_id");

-- CreateIndex
CREATE INDEX "ApplicationTask_assigned_to_idx" ON "ApplicationTask"("assigned_to");

-- CreateIndex
CREATE INDEX "ApplicationTask_status_idx" ON "ApplicationTask"("status");

-- CreateIndex
CREATE INDEX "ApplicationTask_priority_idx" ON "ApplicationTask"("priority");

-- CreateIndex
CREATE INDEX "ApplicationTask_due_date_idx" ON "ApplicationTask"("due_date");

-- CreateIndex
CREATE INDEX "InterviewNote_interview_id_idx" ON "InterviewNote"("interview_id");

-- CreateIndex
CREATE INDEX "InterviewNote_author_id_idx" ON "InterviewNote"("author_id");

-- CreateIndex
CREATE INDEX "AssessmentVote_assessment_id_idx" ON "AssessmentVote"("assessment_id");

-- CreateIndex
CREATE INDEX "AssessmentVote_user_id_idx" ON "AssessmentVote"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentVote_assessment_id_user_id_key" ON "AssessmentVote"("assessment_id", "user_id");

-- CreateIndex
CREATE INDEX "CallLog_application_id_idx" ON "CallLog"("application_id");

-- CreateIndex
CREATE INDEX "CallLog_call_date_idx" ON "CallLog"("call_date");

-- CreateIndex
CREATE INDEX "CallLog_user_id_idx" ON "CallLog"("user_id");

-- CreateIndex
CREATE INDEX "EmailLog_application_id_idx" ON "EmailLog"("application_id");

-- CreateIndex
CREATE INDEX "EmailLog_created_at_idx" ON "EmailLog"("created_at");

-- CreateIndex
CREATE INDEX "EmailLog_user_id_idx" ON "EmailLog"("user_id");

-- CreateIndex
CREATE INDEX "SlackLog_application_id_idx" ON "SlackLog"("application_id");

-- CreateIndex
CREATE INDEX "SlackLog_created_at_idx" ON "SlackLog"("created_at");

-- CreateIndex
CREATE INDEX "SlackLog_user_id_idx" ON "SlackLog"("user_id");

-- CreateIndex
CREATE INDEX "SmsLog_application_id_idx" ON "SmsLog"("application_id");

-- CreateIndex
CREATE INDEX "SmsLog_created_at_idx" ON "SmsLog"("created_at");

-- CreateIndex
CREATE INDEX "SmsLog_user_id_idx" ON "SmsLog"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "country_pricing_map_country_code_key" ON "country_pricing_map"("country_code");

-- CreateIndex
CREATE INDEX "country_pricing_map_country_code_idx" ON "country_pricing_map"("country_code");

-- CreateIndex
CREATE INDEX "country_pricing_map_pricing_peg_idx" ON "country_pricing_map"("pricing_peg");

-- CreateIndex
CREATE INDEX "enterprise_override_company_id_effective_from_idx" ON "enterprise_override"("company_id", "effective_from");

-- CreateIndex
CREATE INDEX "enterprise_override_is_active_idx" ON "enterprise_override"("is_active");

-- CreateIndex
CREATE INDEX "screening_templates_company_id_idx" ON "screening_templates"("company_id");

-- CreateIndex
CREATE INDEX "company_documents_company_id_idx" ON "company_documents"("company_id");

-- CreateIndex
CREATE INDEX "PriceBook_pricing_peg_idx" ON "PriceBook"("pricing_peg");

-- CreateIndex
CREATE INDEX "PriceBook_is_approved_idx" ON "PriceBook"("is_approved");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- AddForeignKey
ALTER TABLE "ApplicationTask" ADD CONSTRAINT "ApplicationTask_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationTask" ADD CONSTRAINT "ApplicationTask_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationTask" ADD CONSTRAINT "ApplicationTask_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNote" ADD CONSTRAINT "InterviewNote_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNote" ADD CONSTRAINT "InterviewNote_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "VideoInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentVote" ADD CONSTRAINT "AssessmentVote_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentVote" ADD CONSTRAINT "AssessmentVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackLog" ADD CONSTRAINT "SlackLog_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackLog" ADD CONSTRAINT "SlackLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_override" ADD CONSTRAINT "enterprise_override_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_override" ADD CONSTRAINT "enterprise_override_price_book_id_fkey" FOREIGN KEY ("price_book_id") REFERENCES "PriceBook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_templates" ADD CONSTRAINT "screening_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
