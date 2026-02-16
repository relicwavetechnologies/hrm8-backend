import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthenticatedRequest } from '../../types';
import { BaseController } from '../../core/controller';

export class ScreeningTemplateController extends BaseController {
  constructor() {
    super('ScreeningTemplate');
  }

  /** GET /api/screening-templates - list templates for the user's company */
  list = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return this.sendError(res, new Error('Company context required'), 403);
      }

      const templates = await prisma.screening_templates.findMany({
        where: {
          OR: [{ company_id: companyId }, { is_system: true }],
        },
        orderBy: { updated_at: 'desc' },
      });

      const data = templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        questions: t.questions,
        isSystem: t.is_system,
        usageCount: t.usage_count,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));

      return this.sendSuccess(res, { templates: data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /** POST /api/screening-templates - create a template */
  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return this.sendError(res, new Error('Company context required'), 403);
      }

      const { name, description, category, questions } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return this.sendError(res, new Error('name is required'), 400);
      }
      if (!Array.isArray(questions)) {
        return this.sendError(res, new Error('questions must be an array'), 400);
      }

      const id = `st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const template = await prisma.screening_templates.create({
        data: {
          id,
          name: name.trim(),
          description: typeof description === 'string' ? description : null,
          category: typeof category === 'string' ? category : null,
          questions: questions as any,
          company_id: companyId,
          is_system: false,
        },
      });

      return this.sendSuccess(res, {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          questions: template.questions,
          isSystem: template.is_system,
          usageCount: template.usage_count,
          createdAt: template.created_at,
          updatedAt: template.updated_at,
        },
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /** GET /api/screening-templates/:id - get one template */
  getById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      const template = await prisma.screening_templates.findUnique({
        where: { id },
      });
      if (!template) {
        return this.sendError(res, new Error('Template not found'), 404);
      }
      if (!template.is_system && template.company_id !== companyId) {
        return this.sendError(res, new Error('Not allowed to access this template'), 403);
      }

      return this.sendSuccess(res, {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          questions: template.questions,
          isSystem: template.is_system,
          usageCount: template.usage_count,
          createdAt: template.created_at,
          updatedAt: template.updated_at,
        },
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
