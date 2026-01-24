"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const company_routes_1 = __importDefault(require("../modules/company/company.routes"));
const user_routes_1 = __importDefault(require("../modules/user/user.routes"));
const job_routes_1 = __importDefault(require("../modules/job/job.routes"));
const candidate_routes_1 = __importDefault(require("../modules/candidate/candidate.routes"));
const error_middleware_1 = require("../middlewares/error.middleware");
const expressLoader = async (app) => {
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    // CORS setup
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const corsOptions = {
        origin: frontendUrl.includes(',') ? frontendUrl.split(',').map(u => u.trim()) : frontendUrl,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    };
    app.use((0, cors_1.default)(corsOptions));
    // Register module routers
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/companies', company_routes_1.default);
    app.use('/api/users', user_routes_1.default);
    app.use('/api/jobs', job_routes_1.default);
    app.use('/api/candidate', candidate_routes_1.default);
    // Error middleware must be registered last
    app.use(error_middleware_1.errorMiddleware);
};
exports.default = expressLoader;
