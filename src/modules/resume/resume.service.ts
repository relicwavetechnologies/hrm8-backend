import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';
import { ResumeRepository } from './resume.repository';
import { CreateAnnotationRequest, ResumeAnnotation } from './resume.types';

export class ResumeService extends BaseService {
    constructor(private repository: ResumeRepository) {
        super();
    }

    async getResume(resumeId: string) {
        const resume = await this.repository.findResume(resumeId);
        if (!resume) {
            throw new HttpException(404, 'Resume not found');
        }
        return resume;
    }

    async getAnnotations(resumeId: string): Promise<ResumeAnnotation[]> {
        // Check if resume exists
        await this.getResume(resumeId);
        return this.repository.findAnnotations(resumeId);
    }

    async createAnnotation(
        resumeId: string,
        data: CreateAnnotationRequest,
        user: { id: string; name: string }
    ): Promise<ResumeAnnotation> {
        // Check if resume exists
        await this.getResume(resumeId);

        // Provide a default color if not provided
        const userColor = data.userColor || '#3B82F6'; // Default blue

        return this.repository.createAnnotation({
            resume_id: resumeId,
            user_id: user.id,
            user_name: user.name,
            user_color: userColor,
            type: data.type,
            text: data.text,
            comment: data.comment,
            position: data.position
        });
    }

    async deleteAnnotation(resumeId: string, annotationId: string, userId: string) {
        // Check if resume exists
        await this.getResume(resumeId);

        const result = await this.repository.deleteAnnotation(annotationId, userId);

        if (result.count === 0) {
            // It's possible the annotation didn't exist, or belonged to another user
            // Ideally we'd check existence first to give specific error, 
            // but for privacy/security sometimes silent fail or generic error is okay.
            // let's check if it exists at all to give better error
            const annotations = await this.repository.findAnnotations(resumeId);
            const annotation = annotations.find(a => a.id === annotationId);

            if (!annotation) {
                throw new HttpException(404, 'Annotation not found');
            }

            if (annotation.user_id !== userId) {
                throw new HttpException(403, 'You can only delete your own annotations');
            }
        }
    }
}
