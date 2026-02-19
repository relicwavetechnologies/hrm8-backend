"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const signup_request_routes_1 = __importDefault(require("../modules/auth/signup-request.routes"));
const company_routes_1 = __importDefault(require("../modules/company/company.routes"));
const user_routes_1 = __importDefault(require("../modules/user/user.routes"));
const job_routes_1 = __importDefault(require("../modules/job/job.routes"));
const job_template_routes_1 = __importDefault(require("../modules/job/job-template.routes"));
const screening_template_routes_1 = __importDefault(require("../modules/job/screening-template.routes"));
const candidate_routes_1 = __importDefault(require("../modules/candidate/candidate.routes"));
const consultant_routes_1 = __importDefault(require("../modules/consultant/consultant.routes"));
const sales_routes_1 = __importDefault(require("../modules/sales/sales.routes"));
const hrm8_routes_1 = __importDefault(require("../modules/hrm8/hrm8.routes"));
const assessment_routes_1 = __importDefault(require("../modules/assessment/assessment.routes"));
const application_routes_1 = __importDefault(require("../modules/application/application.routes"));
const communication_routes_1 = __importDefault(require("../modules/communication/communication.routes"));
const public_routes_1 = __importDefault(require("../modules/public/public.routes"));
const integration_routes_1 = __importDefault(require("../modules/integration/integration.routes"));
const google_oauth_routes_1 = __importDefault(require("../modules/integration/google-oauth.routes"));
const stripe_routes_1 = __importDefault(require("../modules/stripe/stripe.routes"));
const notification_routes_1 = __importDefault(require("../modules/notification/notification.routes"));
const interview_routes_1 = __importDefault(require("../modules/interview/interview.routes"));
const offer_routes_1 = __importDefault(require("../modules/offer/offer.routes"));
const wallet_routes_1 = __importDefault(require("../modules/wallet/wallet.routes"));
const subscription_routes_1 = __importDefault(require("../modules/subscription/subscription.routes"));
const resume_routes_1 = __importDefault(require("../modules/resume/resume.routes"));
const consultant360_routes_1 = __importDefault(require("../modules/consultant360/consultant360.routes"));
const admin_billing_routes_1 = __importDefault(require("../modules/admin-billing/admin-billing.routes"));
const ai_routes_1 = __importDefault(require("../modules/ai/ai.routes"));
const assistant_routes_1 = __importDefault(require("../modules/assistant/assistant.routes"));
const email_template_routes_1 = __importDefault(require("../modules/email/email-template.routes"));
const messaging_routes_1 = __importDefault(require("../modules/messaging/messaging.routes"));
const pricing_routes_1 = __importDefault(require("../modules/pricing/pricing.routes"));
const error_middleware_1 = require("../middlewares/error.middleware");
const logging_middleware_1 = require("../middleware/logging.middleware");
const expressLoader = async (app) => {
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    // HTTP request logging
    app.use(logging_middleware_1.loggingMiddleware);
    // CORS setup
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080,http://localhost:3000,http://localhost:5173';
    const allowedOrigins = frontendUrl.includes(',')
        ? frontendUrl.split(',').map(u => u.trim())
        : [frontendUrl]; // Ensure it's always an array for cors middleware
    const corsOptions = {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    };
    app.use((0, cors_1.default)(corsOptions));
    // Register module routers
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/signup-requests', signup_request_routes_1.default);
    app.use('/api/auth/google', google_oauth_routes_1.default);
    app.use('/api/companies', company_routes_1.default);
    app.use('/api/users', user_routes_1.default);
    app.use('/api/employees', user_routes_1.default); // Alias for frontend compatibility
    app.use('/api/jobs', job_routes_1.default);
    app.use('/api/job-templates', job_template_routes_1.default);
    app.use('/api/screening-templates', screening_template_routes_1.default);
    app.use('/api/applications', application_routes_1.default);
    app.use('/api/assessment', assessment_routes_1.default);
    app.use('/api/assessments', assessment_routes_1.default); // Plural alias for consistency
    app.use('/api/communication', communication_routes_1.default);
    app.use('/api/public', public_routes_1.default);
    app.use('/api/integration', integration_routes_1.default);
    app.use('/api/integrations/stripe', stripe_routes_1.default);
    app.use('/api/notifications', notification_routes_1.default);
    app.use('/api/interviews', interview_routes_1.default);
    app.use('/api/video-interviews', interview_routes_1.default); // Alias for legacy frontend support
    app.use('/api/offers', offer_routes_1.default);
    app.use('/api/wallet', wallet_routes_1.default);
    app.use('/api/subscriptions', subscription_routes_1.default);
    app.use('/api/subscription', subscription_routes_1.default); // Alias for singular access
    app.use('/api/candidate', candidate_routes_1.default);
    app.use('/api/consultant', consultant_routes_1.default);
    app.use('/api/sales', sales_routes_1.default);
    app.use('/api/hrm8', hrm8_routes_1.default);
    app.use('/api/resumes', resume_routes_1.default);
    app.use('/api/consultant360', consultant360_routes_1.default);
    app.use('/api/admin/billing', admin_billing_routes_1.default);
    app.use('/api/ai', ai_routes_1.default);
    app.use('/api/assistant', assistant_routes_1.default);
    app.use('/api/email-templates', email_template_routes_1.default);
    app.use('/api/messaging', messaging_routes_1.default);
    app.use('/api/pricing', pricing_routes_1.default);
    // Error middleware must be registered last
    app.use(error_middleware_1.errorMiddleware);
};
exports.default = expressLoader;
