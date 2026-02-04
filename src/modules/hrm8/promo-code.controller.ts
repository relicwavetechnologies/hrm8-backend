import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { PromoCodeService } from './promo-code.service';
import { PromoCodeRepository } from './promo-code.repository';
import { Hrm8AuthenticatedRequest } from '../../types';

export class PromoCodeController extends BaseController {
    private promoCodeService: PromoCodeService;

    constructor() {
        super();
        this.promoCodeService = new PromoCodeService(new PromoCodeRepository());
    }

    getAll = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.promoCodeService.list();
            return this.sendSuccess(res, { promoCodes: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    create = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.promoCodeService.create(req.body);
            return this.sendSuccess(res, { promoCode: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    update = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.promoCodeService.update(id as string, req.body);
            return this.sendSuccess(res, { promoCode: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
