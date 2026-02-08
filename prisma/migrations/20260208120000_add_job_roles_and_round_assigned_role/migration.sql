-- CreateTable: job_role (per-job roles for post-job setup)
CREATE TABLE "job_role" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable: job_hiring_team_member_role (many-to-many member <-> job role)
CREATE TABLE "job_hiring_team_member_role" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "job_role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_hiring_team_member_role_pkey" PRIMARY KEY ("id")
);

-- AlterTable: JobRound - add assigned_role_id for Simple Flow
ALTER TABLE "JobRound" ADD COLUMN "assigned_role_id" TEXT;

-- CreateIndex
CREATE INDEX "job_role_job_id_idx" ON "job_role"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_hiring_team_member_role_member_id_job_role_id_key" ON "job_hiring_team_member_role"("member_id", "job_role_id");
CREATE INDEX "job_hiring_team_member_role_member_id_idx" ON "job_hiring_team_member_role"("member_id");
CREATE INDEX "job_hiring_team_member_role_job_role_id_idx" ON "job_hiring_team_member_role"("job_role_id");

-- CreateIndex
CREATE INDEX "JobRound_assigned_role_id_idx" ON "JobRound"("assigned_role_id");

-- AddForeignKey: job_role -> Job
ALTER TABLE "job_role" ADD CONSTRAINT "job_role_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: job_hiring_team_member_role -> job_hiring_team_member
ALTER TABLE "job_hiring_team_member_role" ADD CONSTRAINT "job_hiring_team_member_role_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "job_hiring_team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: job_hiring_team_member_role -> job_role
ALTER TABLE "job_hiring_team_member_role" ADD CONSTRAINT "job_hiring_team_member_role_job_role_id_fkey" FOREIGN KEY ("job_role_id") REFERENCES "job_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: JobRound -> job_role (optional)
ALTER TABLE "JobRound" ADD CONSTRAINT "JobRound_assigned_role_id_fkey" FOREIGN KEY ("assigned_role_id") REFERENCES "job_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
