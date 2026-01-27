import { BaseRepository } from '../../core/repository';
import { ResumeAnnotation } from './resume.types';

export class ResumeRepository extends BaseRepository {
    async findResume(resumeId: string) {
        return this.prisma.candidateResume.findUnique({
            where: { id: resumeId },
            include: {
                candidate: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true
                    }
                }
            }
        });
    }

    async findAnnotations(resumeId: string): Promise<ResumeAnnotation[]> {
        const annotations = await this.prisma.resumeAnnotation.findMany({
            where: { resume_id: resumeId },
            orderBy: { created_at: 'asc' }
        });

        // Explicitly cast to match the interface
        return annotations.map(a => ({
            id: a.id,
            resume_id: a.resume_id,
            user_id: a.user_id,
            user_name: a.user_name,
            user_color: a.user_color,
            type: a.type,
            text: a.text,
            comment: a.comment,
            position: a.position,
            created_at: a.created_at
        }));
    }

    async createAnnotation(data: {
        resume_id: string;
        user_id: string;
        user_name: string;
        user_color: string;
        type: string;
        text: string;
        comment?: string;
        position: any;
    }): Promise<ResumeAnnotation> {
        const annotation = await this.prisma.resumeAnnotation.create({
            data: {
                resume_id: data.resume_id,
                user_id: data.user_id,
                user_name: data.user_name,
                user_color: data.user_color,
                type: data.type,
                text: data.text,
                comment: data.comment,
                position: data.position
            }
        });

        return {
            id: annotation.id,
            resume_id: annotation.resume_id,
            user_id: annotation.user_id,
            user_name: annotation.user_name,
            user_color: annotation.user_color,
            type: annotation.type,
            text: annotation.text,
            comment: annotation.comment,
            position: annotation.position,
            created_at: annotation.created_at
        };
    }

    async deleteAnnotation(id: string, userId: string) {
        // Only allow deleting own annotations
        return this.prisma.resumeAnnotation.deleteMany({
            where: {
                id,
                user_id: userId
            }
        });
    }
}
