-- AlterEnum
BEGIN;
CREATE TYPE "public"."CommissionStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'PAID', 'CANCELLED');
ALTER TABLE "public"."Commission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Company" ALTER COLUMN "commission_status" DROP DEFAULT;
ALTER TABLE "public"."Commission" ALTER COLUMN "status" TYPE "public"."CommissionStatus_new" USING ("status"::text::"public"."CommissionStatus_new");
ALTER TABLE "public"."Company" ALTER COLUMN "commission_status" TYPE "public"."CommissionStatus_new" USING ("commission_status"::text::"public"."CommissionStatus_new");
ALTER TYPE "public"."CommissionStatus" RENAME TO "CommissionStatus_old";
ALTER TYPE "public"."CommissionStatus_new" RENAME TO "CommissionStatus";
DROP TYPE "public"."CommissionStatus_old";
ALTER TABLE "public"."Commission" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "public"."Company" ALTER COLUMN "commission_status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."EmailStatus_new" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'BOUNCED', 'FAILED');
ALTER TABLE "public"."EmailLog" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."EmailMessage" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."EmailMessage" ALTER COLUMN "status" TYPE "public"."EmailStatus_new" USING ("status"::text::"public"."EmailStatus_new");
ALTER TYPE "public"."EmailStatus" RENAME TO "EmailStatus_old";
ALTER TYPE "public"."EmailStatus_new" RENAME TO "EmailStatus";
DROP TYPE "public"."EmailStatus_old";
ALTER TABLE "public"."EmailMessage" ALTER COLUMN "status" SET DEFAULT 'SENT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."HiringTeamRole_new" AS ENUM ('ADMIN', 'SHORTLISTING', 'MEMBER');
ALTER TABLE "public"."job_hiring_team_member" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."job_hiring_team_member" ALTER COLUMN "role" TYPE "public"."HiringTeamRole_new" USING ("role"::text::"public"."HiringTeamRole_new");
ALTER TYPE "public"."HiringTeamRole" RENAME TO "HiringTeamRole_old";
ALTER TYPE "public"."HiringTeamRole_new" RENAME TO "HiringTeamRole";
DROP TYPE "public"."HiringTeamRole_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."JobRoundType_new" AS ENUM ('ASSESSMENT', 'INTERVIEW');
ALTER TABLE "public"."JobRound" ALTER COLUMN "type" TYPE "public"."JobRoundType_new" USING ("type"::text::"public"."JobRoundType_new");
ALTER TYPE "public"."JobRoundType" RENAME TO "JobRoundType_old";
ALTER TYPE "public"."JobRoundType_new" RENAME TO "JobRoundType";
DROP TYPE "public"."JobRoundType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."SubscriptionPlanType_new" AS ENUM ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM');
ALTER TABLE "public"."Subscription" ALTER COLUMN "planType" TYPE "public"."SubscriptionPlanType_new" USING ("planType"::text::"public"."SubscriptionPlanType_new");
ALTER TYPE "public"."SubscriptionPlanType" RENAME TO "SubscriptionPlanType_old";
ALTER TYPE "public"."SubscriptionPlanType_new" RENAME TO "SubscriptionPlanType";
DROP TYPE "public"."SubscriptionPlanType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."VirtualTransactionType_new" AS ENUM ('SUBSCRIPTION_PURCHASE', 'SUBSCRIPTION_REFUND', 'JOB_POSTING_DEDUCTION', 'JOB_REFUND', 'COMMISSION_EARNED', 'COMMISSION_WITHDRAWAL', 'ADDON_SERVICE_CHARGE', 'ADDON_SERVICE_REFUND', 'ADMIN_ADJUSTMENT', 'PLATFORM_FEE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ASSESSMENT_CREDIT_DEDUCTION', 'ASSESSMENT_CREDIT_REFUND');
ALTER TABLE "public"."virtual_transactions" ALTER COLUMN "type" TYPE "public"."VirtualTransactionType_new" USING ("type"::text::"public"."VirtualTransactionType_new");
ALTER TYPE "public"."VirtualTransactionType" RENAME TO "VirtualTransactionType_old";
ALTER TYPE "public"."VirtualTransactionType_new" RENAME TO "VirtualTransactionType";
DROP TYPE "public"."VirtualTransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."ApplicationTask" DROP CONSTRAINT "ApplicationTask_application_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ApplicationTask" DROP CONSTRAINT "ApplicationTask_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "public"."ApplicationTask" DROP CONSTRAINT "ApplicationTask_created_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssessmentVote" DROP CONSTRAINT "AssessmentVote_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssessmentVote" DROP CONSTRAINT "AssessmentVote_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CallLog" DROP CONSTRAINT "CallLog_application_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CallLog" DROP CONSTRAINT "CallLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."EmailLog" DROP CONSTRAINT "EmailLog_application_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."EmailLog" DROP CONSTRAINT "EmailLog_template_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."EmailLog" DROP CONSTRAINT "EmailLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."InterviewNote" DROP CONSTRAINT "InterviewNote_author_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."InterviewNote" DROP CONSTRAINT "InterviewNote_interview_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SlackLog" DROP CONSTRAINT "SlackLog_application_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SlackLog" DROP CONSTRAINT "SlackLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SmsLog" DROP CONSTRAINT "SmsLog_application_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SmsLog" DROP CONSTRAINT "SmsLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."company_documents" DROP CONSTRAINT "company_documents_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."enterprise_override" DROP CONSTRAINT "enterprise_override_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."enterprise_override" DROP CONSTRAINT "enterprise_override_price_book_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."screening_templates" DROP CONSTRAINT "screening_templates_company_id_fkey";

-- DropIndex
DROP INDEX "public"."PriceBook_is_approved_idx";

-- DropIndex
DROP INDEX "public"."PriceBook_pricing_peg_idx";

-- DropIndex
DROP INDEX "public"."Product_category_idx";

-- AlterTable
ALTER TABLE "public"."AssessmentConfiguration" DROP COLUMN "evaluation_mode",
DROP COLUMN "min_approvals_count",
DROP COLUMN "voting_rule";

-- AlterTable
ALTER TABLE "public"."AssessmentGrade" DROP COLUMN "vote";

-- AlterTable
ALTER TABLE "public"."Company" DROP COLUMN "billing_currency",
DROP COLUMN "country",
DROP COLUMN "currency_locked_at",
DROP COLUMN "pricing_peg",
DROP COLUMN "region_code";

-- AlterTable
ALTER TABLE "public"."Job" DROP COLUMN "draft_step",
DROP COLUMN "experience_level",
DROP COLUMN "hide_salary",
DROP COLUMN "price_book_id",
DROP COLUMN "price_book_version",
DROP COLUMN "pricing_peg",
DROP COLUMN "salary_period",
DROP COLUMN "setup_complete";

-- AlterTable
ALTER TABLE "public"."JobRound" DROP COLUMN "autoMoveOnPass",
DROP COLUMN "syncPermissions";

-- AlterTable
ALTER TABLE "public"."JobTemplate" DROP COLUMN "tags";

-- AlterTable
ALTER TABLE "public"."PriceBook" DROP COLUMN "approved_at",
DROP COLUMN "approved_by",
DROP COLUMN "billing_currency",
DROP COLUMN "effective_from",
DROP COLUMN "effective_to",
DROP COLUMN "is_approved",
DROP COLUMN "pricing_peg",
DROP COLUMN "version";

-- AlterTable
ALTER TABLE "public"."PriceTier" DROP COLUMN "band_name",
DROP COLUMN "salary_band_max",
DROP COLUMN "salary_band_min";

-- AlterTable
ALTER TABLE "public"."RegionalRevenue" DROP COLUMN "payment_reference";

-- AlterTable
ALTER TABLE "public"."Subscription" DROP COLUMN "price_book_id",
DROP COLUMN "price_book_version",
DROP COLUMN "pricing_peg";

-- AlterTable
ALTER TABLE "public"."job_hiring_team_member" DROP COLUMN "permissions",
ALTER COLUMN "role" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."lead_conversion_requests" DROP COLUMN "intent_snapshot";

-- AlterTable
ALTER TABLE "public"."virtual_transactions" DROP COLUMN "billing_currency_used",
DROP COLUMN "override_id",
DROP COLUMN "price_book_id",
DROP COLUMN "price_book_version",
DROP COLUMN "pricing_peg_used";

-- DropTable
DROP TABLE "public"."ApplicationTask";

-- DropTable
DROP TABLE "public"."AssessmentVote";

-- DropTable
DROP TABLE "public"."CallLog";

-- DropTable
DROP TABLE "public"."EmailLog";

-- DropTable
DROP TABLE "public"."InterviewNote";

-- DropTable
DROP TABLE "public"."SlackLog";

-- DropTable
DROP TABLE "public"."SmsLog";

-- DropTable
DROP TABLE "public"."company_documents";

-- DropTable
DROP TABLE "public"."country_pricing_map";

-- DropTable
DROP TABLE "public"."enterprise_override";

-- DropTable
DROP TABLE "public"."screening_templates";

-- DropEnum
DROP TYPE "public"."CallOutcome";

-- DropEnum
DROP TYPE "public"."SmsStatus";

-- DropEnum
DROP TYPE "public"."TaskPriority";

-- DropEnum
DROP TYPE "public"."TaskStatus";

