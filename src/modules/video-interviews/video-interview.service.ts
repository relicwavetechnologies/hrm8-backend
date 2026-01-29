import { BaseService } from '../../core/service';
import { VideoInterviewRepository, videoInterviewRepository } from './video-interview.repository';
import { HttpException } from '../../core/http-exception';
import { VideoInterviewData, VideoInterviewDetails } from './video-interview.model';

export class VideoInterviewService extends BaseService {
  constructor(
    private videoInterviewRepository: VideoInterviewRepository = videoInterviewRepository
  ) {
    super();
  }

  async getInterviewById(id: string): Promise<VideoInterviewDetails | null> {
    const interview = await this.videoInterviewRepository.findByIdWithDetails(id);

    if (!interview) {
      throw new HttpException(404, 'Interview not found');
    }

    return interview;
  }

  async getJobInterviews(jobId: string): Promise<VideoInterviewData[]> {
    const interviews = await this.videoInterviewRepository.findByJobId(jobId);
    return interviews;
  }

  async deleteInterview(id: string, userId: string, userRole?: string): Promise<void> {
    const interview = await this.videoInterviewRepository.findById(id);

    if (!interview) {
      throw new HttpException(404, 'Interview not found');
    }

    const isAdmin = userRole === 'ADMIN' || userRole === 'HR_MANAGER';

    if (!isAdmin) {
      throw new HttpException(403, 'You do not have permission to delete this interview');
    }

    if (interview.status === 'COMPLETED' || interview.status === 'CANCELLED') {
      throw new HttpException(400, 'Cannot delete a completed or cancelled interview');
    }

    await this.videoInterviewRepository.delete(id);
  }

  async getInterviewWithContext(id: string): Promise<VideoInterviewDetails | null> {
    return this.videoInterviewRepository.findByIdWithDetails(id);
  }
}

export const videoInterviewService = new VideoInterviewService();
