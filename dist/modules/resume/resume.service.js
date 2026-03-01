"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeService = void 0;
const service_1 = require("../../core/service");
const prisma_1 = require("../../utils/prisma");
const application_activity_service_1 = require("../application/application-activity.service");
class ResumeService extends service_1.BaseService {
    /**
     * Get all annotations for a resume
     */
    async getAnnotations(resumeId) {
        return prisma_1.prisma.resumeAnnotation.findMany({
            where: { resume_id: resumeId },
            orderBy: { created_at: 'asc' },
        });
    }
    /**
     * Create a new annotation
     */
    async createAnnotation(data) {
        const annotation = await prisma_1.prisma.resumeAnnotation.create({
            data: {
                resume_id: data.resume_id,
                user_id: data.user_id,
                user_name: data.user_name,
                user_color: data.user_color,
                type: data.type,
                text: data.text,
                comment: data.comment,
                position: data.position,
            },
        });
        let applicationId = data.application_id;
        if (!applicationId) {
            const resume = await prisma_1.prisma.candidateResume.findUnique({
                where: { id: data.resume_id },
                select: { candidate_id: true },
            });
            if (resume?.candidate_id) {
                const app = await prisma_1.prisma.application.findFirst({
                    where: { candidate_id: resume.candidate_id },
                    orderBy: { updated_at: 'desc' },
                    select: { id: true },
                });
                applicationId = app?.id;
            }
        }
        if (applicationId) {
            await application_activity_service_1.ApplicationActivityService.logSafe({
                applicationId,
                actorId: data.user_id,
                action: data.type === 'comment' ? 'annotation_commented' : 'annotation_highlighted',
                subject: data.type === 'comment' ? 'Annotation comment added' : 'Text highlighted',
                description: data.type === 'comment'
                    ? `${data.user_name} commented on highlighted text`
                    : `${data.user_name} highlighted resume text`,
                metadata: {
                    annotationId: annotation.id,
                    resumeId: data.resume_id,
                    type: data.type,
                    comment: data.comment,
                },
            });
        }
        return annotation;
    }
    /**
     * Delete an annotation
     */
    async deleteAnnotation(annotationId, userId) {
        const annotation = await prisma_1.prisma.resumeAnnotation.findUnique({
            where: { id: annotationId },
        });
        if (!annotation) {
            throw new Error('Annotation not found');
        }
        // Only allow the creator to delete (or admin logic can be added later)
        if (annotation.user_id !== userId) {
            throw new Error('Unauthorized to delete this annotation');
        }
        const deleted = await prisma_1.prisma.resumeAnnotation.delete({
            where: { id: annotationId },
        });
        const resume = await prisma_1.prisma.candidateResume.findUnique({
            where: { id: annotation.resume_id },
            select: { candidate_id: true },
        });
        if (resume?.candidate_id) {
            const app = await prisma_1.prisma.application.findFirst({
                where: { candidate_id: resume.candidate_id },
                orderBy: { updated_at: 'desc' },
                select: { id: true },
            });
            if (app?.id) {
                await application_activity_service_1.ApplicationActivityService.logSafe({
                    applicationId: app.id,
                    actorId: userId,
                    action: 'annotation_deleted',
                    subject: 'Annotation removed',
                    description: 'Resume annotation was deleted',
                    metadata: {
                        annotationId: annotation.id,
                        resumeId: annotation.resume_id,
                        type: annotation.type,
                    },
                });
            }
        }
        return deleted;
    }
    /**
     * Get a resume by ID
     */
    async getResume(resumeId) {
        return prisma_1.prisma.candidateResume.findUnique({
            where: { id: resumeId },
        });
    }
}
exports.ResumeService = ResumeService;
