"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeService = void 0;
const service_1 = require("../../core/service");
const prisma_1 = require("../../utils/prisma");
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
        return prisma_1.prisma.resumeAnnotation.create({
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
        return prisma_1.prisma.resumeAnnotation.delete({
            where: { id: annotationId },
        });
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
