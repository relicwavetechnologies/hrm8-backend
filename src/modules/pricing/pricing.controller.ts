import { Request, Response } from 'express';
import { PriceBookSelectionService } from './price-book-selection.service';
import { SalaryBandService } from './salary-band.service';
import { CurrencyAssignmentService } from './currency-assignment.service';
import { PricingAuditService } from './pricing-audit.service';

export class PricingController {
  /**
   * GET /api/pricing/subscription-tiers
   * Get all subscription pricing tiers for current company
   */
  static async getSubscriptionTiers(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID required'
        });
      }

      const tiers = await PriceBookSelectionService.getSubscriptionTiers(companyId);

      res.json({
        success: true,
        data: { tiers }
      });
    } catch (error: any) {
      console.error('Get subscription tiers error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get subscription tiers'
      });
    }
  }

  /**
   * GET /api/pricing/recruitment-services
   * Get all recruitment service prices for current company
   */
  static async getRecruitmentServices(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID required'
        });
      }

      const services = await PriceBookSelectionService.getRecruitmentServicePrices(companyId);

      res.json({
        success: true,
        data: { services }
      });
    } catch (error: any) {
      console.error('Get recruitment services error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get recruitment services'
      });
    }
  }

  /**
   * GET /api/pricing/executive-search-bands
   * Get all executive search salary bands for current company
   */
  static async getExecutiveSearchBands(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID required'
        });
      }

      const bands = await SalaryBandService.getAllExecutiveSearchBands(companyId);

      res.json({
        success: true,
        data: { bands }
      });
    } catch (error: any) {
      console.error('Get executive search bands error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get executive search bands'
      });
    }
  }

  /**
   * POST /api/pricing/calculate-job-price
   * Calculate price for a job based on salary range
   */
  static async calculateJobPrice(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID required'
        });
      }

      const { salaryMax, serviceType } = req.body;

      if (!salaryMax || typeof salaryMax !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Valid salaryMax is required'
        });
      }

      // Determine if executive search
      const bandInfo = await SalaryBandService.determineJobBand(companyId, salaryMax);

      let price, currency, productCode;

      if (bandInfo.isExecutiveSearch) {
        price = bandInfo.price;
        currency = bandInfo.currency;
        productCode = bandInfo.productCode;
      } else {
        // Use regular recruitment service
        const serviceTypeToUse = serviceType || 'FULL';
        const result = await PriceBookSelectionService.getRecruitmentPrice(
          companyId,
          serviceTypeToUse
        );
        price = result.price;
        currency = result.currency;
        productCode = result.tier.product.code;
      }

      res.json({
        success: true,
        data: {
          isExecutiveSearch: bandInfo.isExecutiveSearch,
          band: bandInfo.band,
          price,
          currency,
          productCode,
          salaryMax
        }
      });
    } catch (error: any) {
      console.error('Calculate job price error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to calculate job price'
      });
    }
  }

  /**
   * GET /api/pricing/company-currency
   * Get company's pricing peg and billing currency
   */
  static async getCompanyCurrency(req: Request, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID required'
        });
      }

      const currencies = await CurrencyAssignmentService.getCompanyCurrencies(companyId);

      res.json({
        success: true,
        data: currencies
      });
    } catch (error: any) {
      console.error('Get company currency error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get company currency'
      });
    }
  }

  /**
   * GET /api/pricing/audit/:companyId
   * Get pricing audit trail for a company (admin only)
   */
  static async getPricingAudit(req: Request, res: Response) {
    try {
      const { companyId } = req.params;

      const companyStr = String(companyId);

      // TODO: Add admin permission check

      const audit = await PricingAuditService.getCompanyPricingAudit(companyStr);
      const consistency = await PricingAuditService.validatePricingConsistency(companyStr);

      res.json({
        success: true,
        data: {
          transactions: audit,
          consistency
        }
      });
    } catch (error: any) {
      console.error('Get pricing audit error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get pricing audit'
      });
    }
  }
}
