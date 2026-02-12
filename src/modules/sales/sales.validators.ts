import { HttpException } from '../../core/http-exception';

export class SalesValidators {

  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new HttpException(400, 'Invalid email format');
    }
  }

  static validatePhone(phone: string, countryCode?: string): void {
    // Basic phone validation - can be enhanced based on country
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      throw new HttpException(400, 'Invalid phone format');
    }
    if (phone.replace(/\D/g, '').length < 7) {
      throw new HttpException(400, 'Phone number too short');
    }
  }

  static validateUrl(url: string): void {
    try {
      new URL(url);
    } catch (e) {
      throw new HttpException(400, 'Invalid URL format');
    }
  }

  static validateLeadData(data: any): void {
    const companyName = data.company_name ?? data.companyName;
    if (!companyName || typeof companyName !== 'string') {
      throw new HttpException(400, 'Company name is required and must be a string');
    }
    if (companyName.trim().length < 2) {
      throw new HttpException(400, 'Company name must be at least 2 characters');
    }

    if (!data.email || typeof data.email !== 'string') {
      throw new HttpException(400, 'Email is required and must be a string');
    }
    this.validateEmail(data.email);

    // Country is derived from consultant's region - not required from request

    if (data.phone) {
      this.validatePhone(data.phone);
    }

    if (data.website) {
      this.validateUrl(data.website);
    }
  }

  static validateConversionRequest(data: any): void {
    if (!data.company_name || typeof data.company_name !== 'string') {
      throw new HttpException(400, 'Company name is required');
    }
    if (!data.email || typeof data.email !== 'string') {
      throw new HttpException(400, 'Company email is required');
    }
    if (!data.country || typeof data.country !== 'string') {
      throw new HttpException(400, 'Country is required');
    }

    this.validateEmail(data.email);

    if (data.website) {
      this.validateUrl(data.website);
    }
  }

  static validateWithdrawalAmount(amount: number, availableBalance: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpException(400, 'Amount must be a positive number');
    }
    if (amount > availableBalance) {
      throw new HttpException(400, `Amount exceeds available balance of ${availableBalance}`);
    }
  }

  static validatePaymentMethod(method: string): void {
    const validMethods = ['STRIPE', 'BANK_TRANSFER', 'PAYPAL'];
    if (!validMethods.includes(method)) {
      throw new HttpException(400, `Invalid payment method. Must be one of: ${validMethods.join(', ')}`);
    }
  }

  static validateOpportunityData(data: any): void {
    if (!data.name || typeof data.name !== 'string') {
      throw new HttpException(400, 'Opportunity name is required');
    }
    if (data.name.trim().length < 3) {
      throw new HttpException(400, 'Opportunity name must be at least 3 characters');
    }

    if (data.amount && (typeof data.amount !== 'number' || data.amount < 0)) {
      throw new HttpException(400, 'Amount must be a positive number');
    }

    if (data.expectedCloseDate) {
      const date = new Date(data.expectedCloseDate);
      if (isNaN(date.getTime())) {
        throw new HttpException(400, 'Invalid expectedCloseDate format');
      }
      if (date < new Date()) {
        throw new HttpException(400, 'expectedCloseDate must be in the future');
      }
    }
  }

  static validateActivityData(data: any): void {
    if (!data.type || typeof data.type !== 'string') {
      throw new HttpException(400, 'Activity type is required');
    }
    if (!data.subject || typeof data.subject !== 'string') {
      throw new HttpException(400, 'Activity subject is required');
    }
    if (data.subject.trim().length < 3) {
      throw new HttpException(400, 'Activity subject must be at least 3 characters');
    }
  }
}
