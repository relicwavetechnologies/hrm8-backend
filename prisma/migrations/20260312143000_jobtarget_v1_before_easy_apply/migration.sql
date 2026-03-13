-- CreateEnum
CREATE TYPE "DistributionScope" AS ENUM ('HRM8_ONLY', 'GLOBAL');

-- CreateEnum
CREATE TYPE "JobTargetSyncStatus" AS ENUM ('NOT_SYNCED', 'SYNCING', 'SYNCED', 'FAILED', 'CLOSED');

-- AlterTable
ALTER TABLE "Job"
ADD COLUMN "distribution_scope" "DistributionScope" NOT NULL DEFAULT 'HRM8_ONLY',
ADD COLUMN "jobtarget_budget_tier" TEXT,
ADD COLUMN "jobtarget_remote_job_id" TEXT,
ADD COLUMN "jobtarget_sync_status" "JobTargetSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
ADD COLUMN "jobtarget_last_synced_at" TIMESTAMP(3),
ADD COLUMN "jobtarget_last_error" TEXT;

-- AlterTable
ALTER TABLE "Application"
ADD COLUMN "jobtarget_attribution" JSONB,
ADD COLUMN "jobtarget_new_app_sync_status" TEXT,
ADD COLUMN "jobtarget_new_app_sync_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "jobtarget_new_app_last_error" TEXT,
ADD COLUMN "jobtarget_new_app_next_retry_at" TIMESTAMP(3),
ADD COLUMN "jobtarget_stage_sync_status" TEXT,
ADD COLUMN "jobtarget_stage_sync_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "jobtarget_stage_last_error" TEXT,
ADD COLUMN "jobtarget_stage_next_retry_at" TIMESTAMP(3);
