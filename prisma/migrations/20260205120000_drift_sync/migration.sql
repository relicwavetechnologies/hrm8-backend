-- CreateEnum
CREATE TYPE "HiringTeamRole" AS ENUM ('ADMIN', 'SHORTLISTING', 'MEMBER');

-- CreateEnum
CREATE TYPE "HiringTeamMemberStatus" AS ENUM ('ACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "EvaluationDecision" AS ENUM ('APPROVE', 'REJECT', 'PENDING');

-- AlterEnum
ALTER TYPE "ConsultantStatus" ADD VALUE 'PENDING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailTemplateType" ADD VALUE 'NEW';
ALTER TYPE "EmailTemplateType" ADD VALUE 'ASSESSMENT';
ALTER TYPE "EmailTemplateType" ADD VALUE 'INTERVIEW';
ALTER TYPE "EmailTemplateType" ADD VALUE 'OFFER';
ALTER TYPE "EmailTemplateType" ADD VALUE 'HIRED';

-- AlterEnum
ALTER TYPE "HiringMode" ADD VALUE 'RPO';

-- AlterEnum
ALTER TYPE "UniversalNotificationType" ADD VALUE 'INVITATION_SENT';

-- DropForeignKey
ALTER TABLE "AssessmentResponse" DROP CONSTRAINT "AssessmentResponse_question_id_fkey";

-- DropIndex
DROP INDEX "AssessmentResponse_question_id_idx";

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "started_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AssessmentConfiguration" ADD COLUMN     "auto_move_on_pass" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_reject_on_deadline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_reject_on_fail" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AssessmentResponse" ALTER COLUMN "question_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "EmailTemplate" ADD COLUMN     "attachments" JSONB;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "hrm8_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hrm8_notes" TEXT,
ADD COLUMN     "hrm8_status" "JobStatus";

-- AlterTable
ALTER TABLE "JobRound" ADD COLUMN     "email_config" JSONB;

-- CreateTable
CREATE TABLE "job_hiring_team_member" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "HiringTeamRole" NOT NULL,
    "status" "HiringTeamMemberStatus" NOT NULL DEFAULT 'PENDING',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMP(3),

    CONSTRAINT "job_hiring_team_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEvaluation" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "comment" TEXT,
    "decision" "EvaluationDecision",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_hiring_team_member_job_id_idx" ON "job_hiring_team_member"("job_id");

-- CreateIndex
CREATE INDEX "job_hiring_team_member_user_id_idx" ON "job_hiring_team_member"("user_id");

-- CreateIndex
CREATE INDEX "job_hiring_team_member_email_idx" ON "job_hiring_team_member"("email");

-- CreateIndex
CREATE INDEX "CandidateEvaluation_application_id_idx" ON "CandidateEvaluation"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateEvaluation_application_id_user_id_key" ON "CandidateEvaluation"("application_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResponse_assessment_id_question_id_key" ON "AssessmentResponse"("assessment_id", "question_id");

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_hiring_team_member" ADD CONSTRAINT "job_hiring_team_member_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_hiring_team_member" ADD CONSTRAINT "job_hiring_team_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

