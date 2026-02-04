import { Request, Response } from 'express';
import { SystemSettingsService } from './system-settings.service';
import { Hrm8AuthenticatedRequest } from '../../../types';

export class SystemSettingsController {
  static async getAllSettings(_req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const settings = await SystemSettingsService.getAllSettings();
      const settingsMap: Record<string, any> = {};
      settings.forEach((s: any) => {
        settingsMap[s.key] = s.value;
      });

      res.json({
        success: true,
        data: settingsMap,
      });
    } catch (error: any) {
      console.error('[SystemSettingsController] getAllSettings error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch settings',
      });
    }
  }

  static async updateSetting(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { key, value, isPublic } = req.body;

      if (!key) {
        res.status(400).json({
          success: false,
          error: 'Key is required',
        });
        return;
      }

      const updatedBy = req.hrm8User?.id || 'admin';

      const setting = await SystemSettingsService.setSetting(
        key,
        value,
        isPublic !== undefined ? isPublic : false,
        updatedBy
      );

      res.json({
        success: true,
        message: 'Setting updated successfully',
        data: setting,
      });
    } catch (error: any) {
      console.error('[SystemSettingsController] updateSetting error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update setting',
      });
    }
  }

  static async getPublicSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await SystemSettingsService.getPublicSettings();
      const settingsMap: Record<string, any> = {};
      settings.forEach((s: any) => {
        settingsMap[s.key] = s.value;
      });

      res.json({
        success: true,
        data: settingsMap,
      });
    } catch (error: any) {
      console.error('[SystemSettingsController] getPublicSettings error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch public settings',
      });
    }
  }

  static async bulkUpdateSettings(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { settings } = req.body;

      if (!settings || !Array.isArray(settings)) {
        res.status(400).json({
          success: false,
          error: 'Settings array is required',
        });
        return;
      }

      const updatedBy = req.hrm8User?.id || 'admin';
      const results = [];

      for (const item of settings) {
        if (item.key) {
          const result = await SystemSettingsService.setSetting(
            item.key,
            item.value,
            item.isPublic !== undefined ? item.isPublic : false,
            updatedBy
          );
          results.push(result);
        }
      }

      res.json({
        success: true,
        message: `Updated ${results.length} settings`,
        data: results,
      });
    } catch (error: any) {
      console.error('[SystemSettingsController] bulkUpdateSettings error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to bulk update settings',
      });
    }
  }
}
