-- CreateEnum
CREATE TYPE "JobSetupType" AS ENUM ('SIMPLE', 'ADVANCED');

-- AlterTable (Job table name is PascalCase in baseline)
ALTER TABLE "Job" ADD COLUMN "setup_type" "JobSetupType" NOT NULL DEFAULT 'ADVANCED',
ADD COLUMN "management_type" TEXT;
