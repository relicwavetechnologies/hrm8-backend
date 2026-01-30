import { BaseService } from '../../core/service';
import { prisma } from '../../utils/prisma';

export interface CreateAnnotationRequest {
    resume_id: string;
    user_id: string;
    user_name: string;
    user_color: string;
    type: string;
    text: string;
    comment?: string;
    position: any;
}

export class ResumeService extends BaseService {
    /**
     * Get all annotations for a resume
     */
    async getAnnotations(resumeId: string) {
        return prisma.resumeAnnotation.findMany({
            where: { resume_id: resumeId },
            orderBy: { created_at: 'asc' },
        });
    }

    /**
     * Create a new annotation
     */
    async createAnnotation(data: CreateAnnotationRequest) {
        return prisma.resumeAnnotation.create({
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
    async deleteAnnotation(annotationId: string, userId: string) {
        const annotation = await prisma.resumeAnnotation.findUnique({
            where: { id: annotationId },
        });

        if (!annotation) {
            throw new Error('Annotation not found');
        }

        // Only allow the creator to delete (or admin logic can be added later)
        if (annotation.user_id !== userId) {
            throw new Error('Unauthorized to delete this annotation');
        }

        return prisma.resumeAnnotation.delete({
            where: { id: annotationId },
        });
    }

    /**
     * Get a resume by ID
     */
    async getResume(resumeId: string) {
        return prisma.candidateResume.findUnique({
            where: { id: resumeId },
        });
    }
}
