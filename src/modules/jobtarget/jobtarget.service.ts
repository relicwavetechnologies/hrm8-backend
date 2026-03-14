import { IntegrationStatus, IntegrationType, ApplicationStage } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import {
  APPLICATION_STAGE_TO_JOBTARGET_STAGE,
  JOBTARGET_COMPANY_LINK_NAME,
  JOBTARGET_GLOBAL_INTEGRATION_NAME,
  JOBTARGET_RETRY_DELAY_MINUTES,
  JobTargetAttribution,
} from './jobtarget.constants';

type JobTargetGlobalConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  mode: 'uat' | 'production';
};

type CompanyLinkConfig = {
  remoteCompanyId?: string;
  userMappings?: Record<string, string>;
  lastSyncedAt?: string;
  lastError?: string;
};

type JobTargetLocation = {
  city: string;
  state?: string;
  region?: string;
  country: string;
  zip?: string;
  postalCode?: string;
};

type JobTargetEasyApplyConfig = {
  enabled: boolean;
  type: 'basic' | 'full';
  hostedApply: boolean;
  questionnaireEnabled: boolean;
};

type JobTargetQuestion = {
  id: string;
  question: string;
  required: boolean;
  type: 'select' | 'multiselect' | 'text' | 'file';
  options?: Array<{ label: string; value: string }>;
};

class JobTargetService {
  private defaultBaseUrl(mode: 'uat' | 'production'): string {
    return mode === 'production'
      ? 'https://partner-api.jobtarget.com'
      : 'https://uat-partner-api.jobtarget.com';
  }

  private normalizeMode(modeRaw: unknown): 'uat' | 'production' {
    const normalized = String(modeRaw || '').toLowerCase();
    if (normalized === 'production' || normalized === 'prod') return 'production';
    return 'uat';
  }

  private async getGlobalConfig(): Promise<JobTargetGlobalConfig> {
    const envClientId = String(process.env.JOBTARGET_CLIENT_ID || '').trim();
    const envClientSecret = String(process.env.JOBTARGET_CLIENT_SECRET || '').trim();
    const envBaseUrl = String(process.env.JOBTARGET_BASE_URL || '').trim();

    const integration = await prisma.integration.findFirst({
      where: {
        company_id: null,
        type: IntegrationType.JOB_POSTING_PLATFORM,
        name: JOBTARGET_GLOBAL_INTEGRATION_NAME,
        status: IntegrationStatus.ACTIVE,
      },
      orderBy: { updated_at: 'desc' },
    });

    const config = ((integration?.config || {}) as Record<string, unknown>);
    const requestedMode = this.normalizeMode(
      config.environment || config.mode || process.env.JOBTARGET_MODE || process.env.JOBTARGET_ENV || process.env.NODE_ENV
    );
    const runtimeNodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
    const mode: 'uat' | 'production' =
      runtimeNodeEnv === 'production' && requestedMode === 'production'
        ? 'production'
        : 'uat';

    const clientId = String(config.clientId || config.client_id || integration?.api_key || envClientId || '').trim();
    const clientSecret = String(config.clientSecret || config.client_secret || integration?.api_secret || envClientSecret || '').trim();
    const configuredBaseUrl = String(config.baseUrl || config.base_url || integration?.login_url || '').trim();
    const baseUrl =
      envBaseUrl ||
      (mode === 'production' && configuredBaseUrl
        ? configuredBaseUrl
        : this.defaultBaseUrl(mode));

    if (!clientId || !clientSecret) {
      if (!integration) {
        throw new HttpException(400, 'Missing active JobTarget global integration config and env credentials');
      }
      throw new HttpException(400, 'JobTarget global integration is missing credentials');
    }

    return { baseUrl, clientId, clientSecret, mode };
  }

  private async request<T>(
    baseUrl: string,
    path: string,
    options: RequestInit,
    context: string
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      const message = typeof body === 'object' && body?.message
        ? body.message
        : typeof body === 'object' && body?.error
          ? body.error
          : typeof body === 'string'
            ? body
            : 'Unknown JobTarget error';
      throw new HttpException(502, `${context} failed with ${response.status}: ${message}`);
    }

    return body as T;
  }

  private async getClientToken(config: JobTargetGlobalConfig): Promise<string> {
    const body = await this.request<{ token?: string }>(
      config.baseUrl,
      '/api/token',
      {
        method: 'POST',
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'client_credentials',
        }),
      },
      'JobTarget client token'
    );

    const token = String(body?.token || '').trim();
    if (!token) {
      throw new HttpException(502, 'JobTarget client token response did not include token');
    }
    return token;
  }

  private async getUserToken(config: JobTargetGlobalConfig, email: string, remoteCompanyId?: string): Promise<string> {
    const payload: Record<string, unknown> = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'user_credentials',
      email,
    };

    if (remoteCompanyId && !Number.isNaN(Number(remoteCompanyId))) {
      const companyId = Number(remoteCompanyId);
      payload.companyId = companyId;
      payload.company_id = companyId;
    }

    const body = await this.request<{ token?: string }>(
      config.baseUrl,
      '/api/token',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'JobTarget user token'
    );

    const token = String(body?.token || '').trim();
    if (!token) {
      throw new HttpException(502, 'JobTarget user token response did not include token');
    }

    return token;
  }

  private parseUserName(nameRaw: string): { firstName: string; lastName: string } {
    const trimmed = String(nameRaw || '').trim();
    if (!trimmed) return { firstName: 'Recruiter', lastName: 'User' };
    const parts = trimmed.split(/\s+/);
    const firstName = parts[0] || 'Recruiter';
    const lastName = parts.slice(1).join(' ') || 'User';
    return { firstName, lastName };
  }

  private parseLocationParts(locationRaw: string): { city?: string; state?: string; country?: string } {
    const parts = String(locationRaw || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    return {
      city: parts[0] || undefined,
      state: parts[1] || undefined,
      country: parts[2] || undefined,
    };
  }

  private async ensureCompanyPrimaryLocation(
    company: any,
    location: JobTargetLocation,
    shouldPatchPrimaryLocation: boolean
  ): Promise<void> {
    if (!shouldPatchPrimaryLocation) return;

    const existingProfileData = (company?.profile?.profile_data || {}) as Record<string, unknown>;
    const existingPrimary = (existingProfileData?.primaryLocation || {}) as Record<string, unknown>;
    const nextPrimary = {
      ...existingPrimary,
      name: String(existingPrimary.name || location.city || '').trim(),
      city: String(existingPrimary.city || location.city || '').trim(),
      stateOrRegion: String(existingPrimary.stateOrRegion || location.state || '').trim() || undefined,
      country: String(existingPrimary.country || location.country || '').trim(),
      postalCode: String(existingPrimary.postalCode || location.postalCode || '').trim() || undefined,
    };

    const nextProfileData = {
      ...existingProfileData,
      primaryLocation: nextPrimary,
    };

    if (company?.profile?.id) {
      await prisma.companyProfile.update({
        where: { id: company.profile.id },
        data: { profile_data: nextProfileData as any },
      });
    } else {
      await prisma.companyProfile.create({
        data: {
          company_id: company.id,
          profile_data: nextProfileData as any,
        },
      });
    }

    if (!company.country || !String(company.country).trim()) {
      await prisma.company.update({
        where: { id: company.id },
        data: { country: location.country, country_or_region: location.country },
      });
    }
  }

  private normalizeCompanyLocation(
    company: any,
    fallbackJobLocationRaw?: string
  ): { location: JobTargetLocation; shouldPatchPrimaryLocation: boolean } {
    const profile = (company?.profile?.profile_data || {}) as any;
    const primary = profile?.primaryLocation || null;
    const fallbackLocation = this.parseLocationParts(fallbackJobLocationRaw || '');

    const primaryCity = String(primary?.city || primary?.name || '').trim();
    const primaryCountry = String(primary?.country || '').trim();
    const city = String(primaryCity || fallbackLocation.city || '').trim();
    const state = String(primary?.stateOrRegion || fallbackLocation.state || '').trim();
    const country = String(
      primaryCountry || company?.country || company?.country_or_region || fallbackLocation.country || ''
    ).trim();
    const postalCode = String(primary?.postalCode || '').trim();

    if (!city || !country) {
      throw new HttpException(400, 'Company primary location is required for global publishing');
    }

    const shouldPatchPrimaryLocation = !primaryCity || !primaryCountry;

    return {
      location: {
        city,
        state: state || undefined,
        region: state || undefined,
        country,
        zip: postalCode || undefined,
        postalCode: postalCode || undefined,
      },
      shouldPatchPrimaryLocation,
    };
  }

  private normalizeJobLocation(jobLocationRaw: string, fallbackCountry?: string): JobTargetLocation {
    const parts = String(jobLocationRaw || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const city = parts[0] || 'Remote';
    const state = parts[1] || undefined;
    const country = parts[2] || fallbackCountry || 'US';

    return {
      city,
      state,
      region: state,
      country,
      zip: undefined,
      postalCode: undefined,
    };
  }

  private buildApplyUrl(jobId: string): string {
    const base =
      process.env.JOBTARGET_APPLY_BASE_URL ||
      process.env.CAREERS_PUBLIC_BASE_URL ||
      process.env.CANDIDATE_FRONTEND_URL ||
      process.env.CANDIDATE_PUBLIC_BASE_URL ||
      process.env.FRONTEND_URL ||
      process.env.ATS_FRONTEND_URL ||
      'http://localhost:8080';

    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${cleanBase}/jobs/${jobId}`;
  }

  private buildWebhookBaseUrl(): string {
    const base =
      process.env.JOBTARGET_WEBHOOK_BASE_URL ||
      process.env.PUBLIC_API_BASE_URL ||
      process.env.BACKEND_PUBLIC_BASE_URL ||
      process.env.API_BASE_URL ||
      'http://localhost:3000';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }

  private buildQuestionnaireWebhookUrl(jobId: string): string {
    return `${this.buildWebhookBaseUrl()}/api/public/jobtarget/questionnaire/${jobId}`;
  }

  private buildApplicationDeliveryWebhookUrl(jobId: string): string {
    return `${this.buildWebhookBaseUrl()}/api/public/jobtarget/application-delivery/${jobId}`;
  }

  private normalizeEasyApplyConfig(raw: unknown): JobTargetEasyApplyConfig {
    const obj = (raw && typeof raw === 'object' && !Array.isArray(raw))
      ? (raw as Record<string, unknown>)
      : {};
    const enabled = Boolean(obj.enabled);
    const type = String(obj.type || '').trim().toLowerCase() === 'basic' ? 'basic' : 'full';
    const hostedApply = obj.hostedApply !== undefined ? Boolean(obj.hostedApply) : enabled;
    const questionnaireEnabled = obj.questionnaireEnabled !== undefined ? Boolean(obj.questionnaireEnabled) : enabled;
    return { enabled, type, hostedApply, questionnaireEnabled };
  }

  private getEasyApplyConfigFromJob(job: any): JobTargetEasyApplyConfig {
    const appForm = (job?.application_form && typeof job.application_form === 'object' && !Array.isArray(job.application_form))
      ? (job.application_form as Record<string, unknown>)
      : {};
    return this.normalizeEasyApplyConfig(appForm.jobTargetEasyApplyConfig);
  }

  private normalizeQuestionType(rawType: unknown): JobTargetQuestion['type'] {
    const value = String(rawType || '').trim().toLowerCase();
    if (['single-select', 'single_select', 'radio', 'select', 'yes_no', 'yes-no', 'boolean'].includes(value)) return 'select';
    if (['multi-select', 'multi_select', 'multiselect', 'checkbox', 'checkboxes'].includes(value)) return 'multiselect';
    if (['file', 'upload'].includes(value)) return 'file';
    return 'text';
  }

  private normalizeQuestionOptions(raw: unknown): Array<{ label: string; value: string }> | undefined {
    if (!Array.isArray(raw)) return undefined;
    const options = raw
      .map((opt) => {
        if (opt == null) return null;
        if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
          const val = String(opt).trim();
          return val ? { label: val, value: val } : null;
        }
        if (typeof opt === 'object') {
          const o = opt as Record<string, unknown>;
          const label = String(o.label ?? o.text ?? o.name ?? o.value ?? '').trim();
          const value = String(o.value ?? o.id ?? o.key ?? label).trim();
          if (!label && !value) return null;
          return { label: label || value, value: value || label };
        }
        return null;
      })
      .filter((opt): opt is { label: string; value: string } => !!opt);
    return options.length ? options : undefined;
  }

  private async getCompanyLink(companyId: string) {
    return prisma.integration.findFirst({
      where: {
        company_id: companyId,
        type: IntegrationType.JOB_POSTING_PLATFORM,
        name: JOBTARGET_COMPANY_LINK_NAME,
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  private async upsertCompanyLink(companyId: string, config: CompanyLinkConfig, syncStatus: string, errorMessage?: string | null) {
    const existing = await this.getCompanyLink(companyId);
    const payload = {
      company_id: companyId,
      type: IntegrationType.JOB_POSTING_PLATFORM,
      name: JOBTARGET_COMPANY_LINK_NAME,
      status: IntegrationStatus.ACTIVE,
      config: config as any,
      sync_status: syncStatus,
      last_sync_at: new Date(),
      error_message: errorMessage || null,
    };

    if (existing) {
      return prisma.integration.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return prisma.integration.create({ data: payload });
  }

  private extractRemoteCompanyId(response: any): string | undefined {
    const candidates = [
      response?.companyId,
      response?.company?.companyId,
      response?.data?.companyId,
      response?.id,
    ];
    for (const value of candidates) {
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return undefined;
  }

  private extractRemoteUserId(response: any): string | undefined {
    const candidates = [
      response?.userId,
      response?.user?.userId,
      response?.data?.userId,
      response?.id,
    ];
    for (const value of candidates) {
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return undefined;
  }

  private extractRemoteJobId(response: any): string | undefined {
    const candidates = [
      response?.jobId,
      response?.job?.jobId,
      response?.data?.jobId,
      response?.id,
    ];
    for (const value of candidates) {
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return undefined;
  }

  private extractMarketplaceUrl(response: any): string | undefined {
    const candidates = [
      response?.marketplace,
      response?.url,
      response?.sso?.marketplace,
      response?.sso?.jobManager,
      response?.data?.marketplace,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return undefined;
  }

  private normalizeTextDescription(text: string): string {
    return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private async syncCompany(
    config: JobTargetGlobalConfig,
    token: string,
    companyId: string,
    fallbackJobLocationRaw?: string
  ): Promise<{ remoteCompanyId: string; linkConfig: CompanyLinkConfig }> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { profile: true },
    });

    if (!company) throw new HttpException(404, 'Company not found for JobTarget sync');

    const companyLink = await this.getCompanyLink(companyId);
    const existingConfig = (companyLink?.config || {}) as CompanyLinkConfig;
    const remoteCompanyId = existingConfig.remoteCompanyId;

    const { location, shouldPatchPrimaryLocation } = this.normalizeCompanyLocation(company, fallbackJobLocationRaw);
    await this.ensureCompanyPrimaryLocation(company, location, shouldPatchPrimaryLocation);

    const body = {
      externalCompanyId: company.id,
      name: company.name,
      demo: false,
      accountType: 'enterprise',
      location,
    };

    let response: any;
    if (remoteCompanyId) {
      response = await this.request<any>(
        config.baseUrl,
        `/api/v1/company/${remoteCompanyId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        },
        'JobTarget update company'
      );
    } else {
      response = await this.request<any>(
        config.baseUrl,
        '/api/v1/company',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        },
        'JobTarget create company'
      );
    }

    const finalRemoteCompanyId = this.extractRemoteCompanyId(response) || remoteCompanyId;
    if (!finalRemoteCompanyId) {
      throw new HttpException(502, 'JobTarget company sync did not return a company id');
    }

    const linkConfig: CompanyLinkConfig = {
      ...(existingConfig || {}),
      remoteCompanyId: finalRemoteCompanyId,
      userMappings: existingConfig.userMappings || {},
      lastSyncedAt: new Date().toISOString(),
      lastError: undefined,
    };

    await this.upsertCompanyLink(companyId, linkConfig, 'SYNCED', null);
    return { remoteCompanyId: finalRemoteCompanyId, linkConfig };
  }

  private async syncUser(
    config: JobTargetGlobalConfig,
    token: string,
    companyId: string,
    remoteCompanyId: string,
    linkConfig: CompanyLinkConfig,
    userId: string
  ): Promise<{ remoteUserId: string; linkConfig: CompanyLinkConfig; user: { id: string; email: string; name: string } }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) throw new HttpException(404, 'User not found for JobTarget sync');
    if (!user.email) throw new HttpException(400, 'User email is required for JobTarget sync');

    const name = this.parseUserName(user.name);
    const userMappings = { ...(linkConfig.userMappings || {}) };
    const remoteUserId = userMappings[user.id];

    const payload = {
      externalUserId: user.id,
      firstName: name.firstName,
      lastName: name.lastName,
      title: 'Recruiter',
      email: user.email,
      phoneNumber: '',
      isAdmin: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
    };

    let response: any;
    if (remoteUserId) {
      response = await this.request<any>(
        config.baseUrl,
        `/api/v1/user/${remoteUserId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
        'JobTarget update user'
      );
    } else {
      response = await this.request<any>(
        config.baseUrl,
        `/api/v1/company/${remoteCompanyId}/user`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
        'JobTarget create user'
      );
    }

    const finalRemoteUserId = this.extractRemoteUserId(response) || remoteUserId;
    if (!finalRemoteUserId) {
      throw new HttpException(502, 'JobTarget user sync did not return a user id');
    }

    userMappings[user.id] = finalRemoteUserId;
    const updatedLinkConfig: CompanyLinkConfig = {
      ...linkConfig,
      remoteCompanyId,
      userMappings,
      lastSyncedAt: new Date().toISOString(),
      lastError: undefined,
    };

    await this.upsertCompanyLink(companyId, updatedLinkConfig, 'SYNCED', null);

    return {
      remoteUserId: finalRemoteUserId,
      linkConfig: updatedLinkConfig,
      user: { id: user.id, email: user.email, name: user.name || '' },
    };
  }

  private async upsertRemoteJob(
    config: JobTargetGlobalConfig,
    token: string,
    job: any,
    companyName: string,
    fallbackCountry: string,
    contactName: string,
    contactEmail: string
  ): Promise<{ remoteJobId: string; response: any }> {
    const location = this.normalizeJobLocation(job.location, fallbackCountry);
    const easyApply = this.getEasyApplyConfigFromJob(job);
    const payload: Record<string, unknown> = {
      requisitionName: job.job_code || job.id,
      title: job.title,
      description: this.normalizeTextDescription(job.description),
      companyName,
      applyUrl: this.buildApplyUrl(job.id),
      locations: [location],
      requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : undefined,
      salaryLow: job.salary_min != null ? String(job.salary_min) : undefined,
      salaryHigh: job.salary_max != null ? String(job.salary_max) : undefined,
      contactName: contactName || 'Recruiter',
      contactEmail,
      easyApply: easyApply.enabled,
      easyApplyType: easyApply.enabled ? (easyApply.type === 'basic' ? 1 : 2) : undefined,
      hostedApply: easyApply.enabled ? easyApply.hostedApply : false,
      questionnaireWebhook: easyApply.enabled && easyApply.questionnaireEnabled
        ? this.buildQuestionnaireWebhookUrl(job.id)
        : undefined,
      applicationdeliveryWebhook: easyApply.enabled
        ? this.buildApplicationDeliveryWebhookUrl(job.id)
        : undefined,
      locale: easyApply.enabled ? 'en-US' : undefined,
      active: job.status === 'OPEN',
      metadata: {
        hrm8JobId: job.id,
        distributionScope: job.distribution_scope,
      },
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined || payload[k] === null || payload[k] === '') delete payload[k];
    });

    let response: any;
    if (job.job_target_remote_job_id) {
      response = await this.request<any>(
        config.baseUrl,
        `/api/v1/job/${job.job_target_remote_job_id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
        'JobTarget edit job'
      );
    } else {
      response = await this.request<any>(
        config.baseUrl,
        '/api/v1/job',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
        'JobTarget create job'
      );
    }

    const remoteJobId = this.extractRemoteJobId(response) || job.job_target_remote_job_id;
    if (!remoteJobId) {
      throw new HttpException(502, 'JobTarget job sync did not return a job id');
    }

    return { remoteJobId, response };
  }

  async syncJobForPublish(jobId: string, companyId: string, publisherUserId: string): Promise<{ remoteJobId: string }> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          include: { profile: true },
        },
      },
    });

    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');
    if (job.distribution_scope !== 'GLOBAL') {
      return { remoteJobId: job.job_target_remote_job_id || '' };
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        job_target_sync_status: 'SYNCING' as any,
        job_target_last_error: null,
      },
    });

    try {
      const globalConfig = await this.getGlobalConfig();
      const clientToken = await this.getClientToken(globalConfig);
      const companyLocationInfo = this.normalizeCompanyLocation(job.company, job.location);
      await this.ensureCompanyPrimaryLocation(job.company, companyLocationInfo.location, companyLocationInfo.shouldPatchPrimaryLocation);

      const companySync = await this.syncCompany(globalConfig, clientToken, companyId, job.location);
      const userSync = await this.syncUser(
        globalConfig,
        clientToken,
        companyId,
        companySync.remoteCompanyId,
        companySync.linkConfig,
        publisherUserId
      );
      const userToken = await this.getUserToken(
        globalConfig,
        userSync.user.email,
        companySync.remoteCompanyId
      );

      const { remoteJobId } = await this.upsertRemoteJob(
        globalConfig,
        userToken,
        job,
        job.company?.name || 'Company',
        companyLocationInfo.location.country,
        userSync.user.name,
        userSync.user.email
      );

      await prisma.job.update({
        where: { id: job.id },
        data: {
          job_target_remote_job_id: remoteJobId,
          job_target_sync_status: 'SYNCED' as any,
          job_target_last_synced_at: new Date(),
          job_target_last_error: null,
        },
      });

      return { remoteJobId };
    } catch (error: any) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          job_target_sync_status: 'FAILED' as any,
          job_target_last_error: error?.message || 'JobTarget publish sync failed',
          job_target_last_synced_at: new Date(),
        },
      });
      throw error;
    }
  }

  async syncJobEdit(jobId: string, companyId: string, actorUserId?: string): Promise<void> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: { include: { profile: true } } },
    });
    if (!job || job.company_id !== companyId) return;
    if (job.distribution_scope !== 'GLOBAL') return;

    const userId = actorUserId || job.created_by;

    try {
      await this.syncJobForPublish(jobId, companyId, userId);
    } catch (error: any) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          job_target_sync_status: 'FAILED' as any,
          job_target_last_error: error?.message || 'JobTarget edit sync failed',
          job_target_last_synced_at: new Date(),
        },
      });
    }
  }

  async closeRemoteJob(jobId: string, companyId: string, actorUserId?: string): Promise<void> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.company_id !== companyId) return;
    if (job.distribution_scope !== 'GLOBAL' || !job.job_target_remote_job_id) return;

    try {
      const globalConfig = await this.getGlobalConfig();
      const companyLink = await this.getCompanyLink(companyId);
      const linkConfig = (companyLink?.config || {}) as CompanyLinkConfig;

      let token = await this.getClientToken(globalConfig);
      try {
        const fallbackUserId = actorUserId || job.created_by;
        if (fallbackUserId) {
          const user = await prisma.user.findUnique({
            where: { id: fallbackUserId },
            select: { email: true },
          });
          if (user?.email) {
            token = await this.getUserToken(globalConfig, user.email, linkConfig.remoteCompanyId);
          }
        }
      } catch {
        // Keep client token fallback for close/stop flows.
      }

      try {
        await this.request<any>(
          globalConfig.baseUrl,
          `/api/v1/job/${job.job_target_remote_job_id}/close`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          },
          'JobTarget close job'
        );
      } catch {
        await this.request<any>(
          globalConfig.baseUrl,
          `/api/v2/job/${job.job_target_remote_job_id}/postings/stop`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          },
          'JobTarget stop postings'
        );
      }

      await prisma.job.update({
        where: { id: jobId },
        data: {
          job_target_sync_status: 'CLOSED' as any,
          job_target_last_error: null,
          job_target_last_synced_at: new Date(),
        },
      });
    } catch (error: any) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          job_target_sync_status: 'FAILED' as any,
          job_target_last_error: error?.message || 'JobTarget close sync failed',
          job_target_last_synced_at: new Date(),
        },
      });
    }
  }

  async mintMarketplaceSession(jobId: string, companyId: string, userId: string): Promise<{ url: string; remoteJobId: string; syncStatus: string }> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new HttpException(404, 'Job not found');
    if (job.company_id !== companyId) throw new HttpException(403, 'Unauthorized');

    if (job.distribution_scope !== 'GLOBAL') {
      throw new HttpException(400, 'JobTarget Marketplace is only available for GLOBAL jobs');
    }

    let remoteJobId = job.job_target_remote_job_id;
    let syncStatus = job.job_target_sync_status;
    if (!remoteJobId || job.job_target_sync_status !== 'SYNCED') {
      const sync = await this.syncJobForPublish(job.id, companyId, userId);
      remoteJobId = sync.remoteJobId;
      syncStatus = 'SYNCED';
    }

    if (!remoteJobId) {
      throw new HttpException(502, 'Unable to sync JobTarget job before marketplace launch');
    }

    const globalConfig = await this.getGlobalConfig();
    const companyLink = await this.getCompanyLink(companyId);
    const linkConfig = (companyLink?.config || {}) as CompanyLinkConfig;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user?.email) {
      throw new HttpException(400, 'User email is required to launch JobTarget marketplace');
    }

    const userToken = await this.getUserToken(globalConfig, user.email, linkConfig.remoteCompanyId);
    const response = await this.request<any>(
      globalConfig.baseUrl,
      `/api/sso/marketplace?jobId=${encodeURIComponent(remoteJobId)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
      'JobTarget marketplace SSO'
    );

    const url = this.extractMarketplaceUrl(response);
    if (!url) {
      throw new HttpException(502, 'JobTarget marketplace SSO response did not include a launch URL');
    }

    return {
      url,
      remoteJobId,
      syncStatus,
    };
  }

  verifyIncomingWebhookSecret(secretHeader?: string): void {
    const configured = String(process.env.JOBTARGET_WEBHOOK_SECRET || '').trim();
    if (!configured) return;
    const incoming = String(secretHeader || '').trim();
    if (!incoming || incoming !== configured) {
      throw new HttpException(401, 'Invalid JobTarget webhook secret');
    }
  }

  async getQuestionnaireForJob(jobId: string): Promise<{ questions: JobTargetQuestion[] }> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        distribution_scope: true,
        application_form: true,
      },
    });

    if (!job) throw new HttpException(404, 'Job not found');
    if (job.distribution_scope !== 'GLOBAL') {
      return { questions: [] };
    }

    const easyApply = this.getEasyApplyConfigFromJob(job);
    if (!easyApply.enabled || !easyApply.questionnaireEnabled) {
      return { questions: [] };
    }

    const appForm = (job.application_form && typeof job.application_form === 'object' && !Array.isArray(job.application_form))
      ? (job.application_form as Record<string, unknown>)
      : {};
    const rawQuestions = Array.isArray(appForm.questions) ? appForm.questions : [];

    const questions: JobTargetQuestion[] = rawQuestions
      .map((rawQuestion, idx) => {
        if (!rawQuestion || typeof rawQuestion !== 'object' || Array.isArray(rawQuestion)) return null;
        const q = rawQuestion as Record<string, unknown>;
        const id = String(q.id || q.questionId || q.key || `q-${idx + 1}`).trim();
        const question = String(q.question || q.text || q.label || q.title || '').trim();
        if (!id || !question) return null;

        const type = this.normalizeQuestionType(q.type);
        const options = this.normalizeQuestionOptions(q.options);
        return {
          id,
          question,
          required: Boolean(q.required),
          type,
          options: (type === 'select' || type === 'multiselect') ? (options || []) : undefined,
        } as JobTargetQuestion;
      })
      .filter((q): q is JobTargetQuestion => !!q);

    return { questions };
  }

  async ingestApplicationDelivery(jobId: string, payload: any): Promise<{ applicationId: string; duplicate: boolean }> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        distribution_scope: true,
        title: true,
      },
    });

    if (!job) throw new HttpException(404, 'Job not found');
    if (job.distribution_scope !== 'GLOBAL') {
      throw new HttpException(400, 'JobTarget application delivery is only available for GLOBAL jobs');
    }

    const deliveryId = String(payload?.id || '').trim();
    if (deliveryId) {
      const duplicateByDeliveryId = await prisma.application.findFirst({
        where: {
          job_id: job.id,
          questionnaire_data: {
            path: ['jobtargetDeliveryId'],
            equals: deliveryId,
          },
        } as any,
        select: { id: true },
      });
      if (duplicateByDeliveryId) {
        return { applicationId: duplicateByDeliveryId.id, duplicate: true };
      }
    }

    const applicant = (payload?.applicant || {}) as Record<string, unknown>;
    const fullName = String(applicant.fullName || '').trim();
    const firstName = String(applicant.firstName || fullName.split(/\s+/)[0] || 'JobTarget').trim();
    const lastName = String(applicant.lastName || fullName.split(/\s+/).slice(1).join(' ') || 'Applicant').trim();
    const email = String(applicant.email || '').trim().toLowerCase();
    const phoneNumber = String(applicant.phoneNumber || '').trim();

    if (!email) {
      throw new HttpException(400, 'Application delivery payload is missing applicant email');
    }

    const rawAnswers = Array.isArray(payload?.questions?.answers) ? payload.questions.answers : [];
    const customAnswers: Record<string, unknown> = {};
    rawAnswers.forEach((answer: any) => {
      if (!answer || typeof answer !== 'object') return;
      const id = String(answer.id || '').trim();
      if (!id) return;
      customAnswers[id] = answer.value ?? null;
    });

    const applicantGuid = String(payload?.applicantGuid || payload?.applicant?.applicantGuid || '').trim();
    if (applicantGuid) {
      const duplicateByApplicantGuid = await prisma.application.findFirst({
        where: {
          job_id: job.id,
          job_target_attribution: {
            path: ['applicantGuid'],
            equals: applicantGuid,
          },
        } as any,
        select: { id: true },
      });
      if (duplicateByApplicantGuid) {
        return { applicationId: duplicateByApplicantGuid.id, duplicate: true };
      }
    }

    let candidate = await prisma.candidate.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!candidate) {
      const bcrypt = await import('bcrypt');
      const generatedPassword = `jt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const passwordHash = await bcrypt.hash(generatedPassword, 10);
      candidate = await prisma.candidate.create({
        data: {
          email,
          password_hash: passwordHash,
          first_name: firstName || 'JobTarget',
          last_name: lastName || 'Applicant',
          phone: phoneNumber || null,
          status: 'ACTIVE',
          email_verified: false,
        },
        select: { id: true },
      });
    }

    const resumeFile = (applicant?.resume as any)?.file as Record<string, unknown> | undefined;
    const resumeUrl =
      String((applicant?.resume as any)?.url || '').trim() ||
      (resumeFile?.fileName ? `jobtarget://resume/${encodeURIComponent(String(resumeFile.fileName))}` : null);

    const attribution = this.extractAttribution({
      applicantGuid: applicantGuid || undefined,
      source: payload?.source,
      medium: payload?.medium,
      campaign: payload?.campaign,
      rawQuery: {
        ochash: payload?.ochash,
        ocprof: payload?.ocprof,
        ats: payload?.ats,
      },
    });
    const sourceLabel = this.sourceLabelFromAttribution(attribution) || 'JobTarget';

    const questionnaireData = {
      jobtargetDeliveryId: deliveryId || undefined,
      jobtargetPayload: payload,
      questions: payload?.questions?.questions || [],
      answers: rawAnswers,
    };

    const application = await prisma.application.create({
      data: {
        candidate_id: candidate.id,
        job_id: job.id,
        status: 'NEW',
        stage: 'NEW_APPLICATION',
        source: sourceLabel,
        resume_url: resumeUrl,
        cover_letter_url: String(applicant?.coverLetter || '').trim() || null,
        custom_answers: customAnswers as any,
        questionnaire_data: questionnaireData as any,
        job_target_attribution: attribution as any,
      },
      select: { id: true, stage: true },
    });

    await this.retryPendingSyncIfDue(application.id, application.stage);
    await this.syncNewApplicationEvent(application.id);

    return { applicationId: application.id, duplicate: false };
  }

  extractAttribution(payload: any): JobTargetAttribution | null {
    const base = (payload?.jobTargetAttribution || payload || {}) as Record<string, unknown>;
    const rawQuery = (base.rawQuery || payload?.rawQuery || {}) as Record<string, unknown>;

    const applicantGuid = String(
      base.applicantGuid || base.applicant_guid || rawQuery.applicant_guid || ''
    ).trim();
    const source = String(base.source || rawQuery.source || '').trim();
    const medium = String(base.medium || base.utm_medium || rawQuery.utm_medium || '').trim();
    const campaign = String(base.campaign || base.utm_campaign || rawQuery.utm_campaign || '').trim();

    const normalizedRawQuery: Record<string, string> = {};
    Object.entries(rawQuery || {}).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim()) normalizedRawQuery[k] = v;
    });

    if (!applicantGuid && !source && !medium && !campaign && Object.keys(normalizedRawQuery).length === 0) {
      return null;
    }

    return {
      applicantGuid: applicantGuid || undefined,
      source: source || undefined,
      medium: medium || undefined,
      campaign: campaign || undefined,
      rawQuery: Object.keys(normalizedRawQuery).length ? normalizedRawQuery : undefined,
    };
  }

  sourceLabelFromAttribution(attribution: JobTargetAttribution | null | undefined): string | undefined {
    if (!attribution) return undefined;
    const normalizedSource = String(attribution.source || '').trim();
    if (normalizedSource) {
      if (/jobtarget/i.test(normalizedSource)) return normalizedSource;
      return `JobTarget via ${normalizedSource}`;
    }

    const normalizedMedium = String(attribution.medium || '').trim();
    if (normalizedMedium) return `JobTarget via ${normalizedMedium}`;
    if (attribution.applicantGuid) return 'JobTarget';
    return undefined;
  }

  private nextRetryDate(attempts: number): Date {
    const minutes = JOBTARGET_RETRY_DELAY_MINUTES * Math.max(1, attempts);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  async syncNewApplicationEvent(applicationId: string): Promise<void> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
      },
    });

    if (!application) return;

    const attribution = (application.job_target_attribution || null) as JobTargetAttribution | null;
    const applicantGuid = attribution?.applicantGuid;
    const shouldSync = !!(applicantGuid && application.job?.distribution_scope === 'GLOBAL' && application.job?.job_target_remote_job_id);

    if (!shouldSync) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          job_target_new_app_sync_status: 'NOT_REQUIRED',
          job_target_new_app_last_error: null,
          job_target_new_app_next_retry_at: null,
        },
      });
      return;
    }

    const attempts = (application.job_target_new_app_sync_attempts || 0) + 1;

    try {
      const globalConfig = await this.getGlobalConfig();
      const token = await this.getClientToken(globalConfig);

      await this.request<any>(
        globalConfig.baseUrl,
        `/api/v1/applicant/${encodeURIComponent(applicantGuid!)}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            stage: 'New Application',
            substage: 'Applied',
            updatedAt: new Date().toISOString(),
          }),
        },
        'JobTarget new application sync'
      );

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          job_target_new_app_sync_status: 'SYNCED',
          job_target_new_app_sync_attempts: attempts,
          job_target_new_app_last_error: null,
          job_target_new_app_next_retry_at: null,
        },
      });
    } catch (error: any) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          job_target_new_app_sync_status: 'FAILED',
          job_target_new_app_sync_attempts: attempts,
          job_target_new_app_last_error: error?.message || 'JobTarget new application sync failed',
          job_target_new_app_next_retry_at: this.nextRetryDate(attempts),
        },
      });
    }
  }

  async syncStageChange(applicationId: string, stage: ApplicationStage): Promise<void> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
      },
    });

    if (!application) return;

    const attribution = (application.job_target_attribution || null) as JobTargetAttribution | null;
    const applicantGuid = attribution?.applicantGuid;
    const stageMapping = APPLICATION_STAGE_TO_JOBTARGET_STAGE[stage];

    const shouldSync = !!(applicantGuid && stageMapping && application.job?.distribution_scope === 'GLOBAL' && application.job?.job_target_remote_job_id);

    if (!shouldSync) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          job_target_stage_sync_status: 'NOT_REQUIRED',
          job_target_stage_last_error: null,
          job_target_stage_next_retry_at: null,
        },
      });
      return;
    }

    const attempts = (application.job_target_stage_sync_attempts || 0) + 1;

    try {
      const globalConfig = await this.getGlobalConfig();
      const token = await this.getClientToken(globalConfig);

      await this.request<any>(
        globalConfig.baseUrl,
        `/api/v1/applicant/${encodeURIComponent(applicantGuid!)}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            stage: stageMapping.stage,
            substage: stageMapping.substage,
            updatedAt: new Date().toISOString(),
          }),
        },
        'JobTarget applicant stage sync'
      );

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          job_target_stage_sync_status: 'SYNCED',
          job_target_stage_sync_attempts: attempts,
          job_target_stage_last_error: null,
          job_target_stage_next_retry_at: null,
        },
      });
    } catch (error: any) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          job_target_stage_sync_status: 'FAILED',
          job_target_stage_sync_attempts: attempts,
          job_target_stage_last_error: error?.message || 'JobTarget stage sync failed',
          job_target_stage_next_retry_at: this.nextRetryDate(attempts),
        },
      });
    }
  }

  async retryPendingSyncIfDue(applicationId: string, currentStage: ApplicationStage): Promise<void> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        job_target_new_app_sync_status: true,
        job_target_new_app_next_retry_at: true,
        job_target_stage_sync_status: true,
        job_target_stage_next_retry_at: true,
      },
    });

    if (!application) return;

    const now = Date.now();
    const shouldRetryNew =
      application.job_target_new_app_sync_status === 'FAILED' &&
      (!!application.job_target_new_app_next_retry_at && application.job_target_new_app_next_retry_at.getTime() <= now);

    const shouldRetryStage =
      application.job_target_stage_sync_status === 'FAILED' &&
      (!!application.job_target_stage_next_retry_at && application.job_target_stage_next_retry_at.getTime() <= now);

    if (shouldRetryNew) {
      await this.syncNewApplicationEvent(applicationId);
    }

    if (shouldRetryStage) {
      await this.syncStageChange(applicationId, currentStage);
    }
  }
}

export const jobTargetService = new JobTargetService();
