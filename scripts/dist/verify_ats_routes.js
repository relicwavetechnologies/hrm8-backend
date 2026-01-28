"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
// Configuration
// @ts-ignore
const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const prisma = new client_1.PrismaClient();
// Utils
const generateRandomString = (length = 8) => crypto.randomBytes(length).toString('hex');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// State
let authToken = null;
let sessionCookie = null;
let companyId = null;
let userId = null;
let jobId = null;
let axiosInstance;
// Logger
const logger = {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
    error: (msg, err) => { var _a; return console.error(`[ERROR] ${msg}`, ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) || (err === null || err === void 0 ? void 0 : err.message) || err); },
    success: (msg) => console.log(`[SUCCESS] ${msg}`),
    subStep: (msg) => console.log(`  -> ${msg}`),
};
async function setupAxios() {
    axiosInstance = axios_1.default.create({
        baseURL: BASE_URL,
        validateStatus: () => true, // Don't throw on error status
    });
    // Request interceptor to add cookie/auth
    axiosInstance.interceptors.request.use(config => {
        if (sessionCookie) {
            config.headers['Cookie'] = sessionCookie;
        }
        return config;
    });
}
async function signupAndVerify() {
    logger.info('Starting Auth Flow...');
    const domain = `${generateRandomString()}.com`;
    const email = `admin@${domain}`;
    const password = 'Password@123';
    const companyName = `Test Corp ${generateRandomString()}`;
    // 1. Signup
    logger.subStep(`Registering company... (${email})`);
    const signupRes = await axiosInstance.post('/api/auth/register/company', {
        companyName,
        companyWebsite: `https://${domain}`,
        domain: domain,
        adminEmail: email,
        adminFirstName: 'Test',
        adminLastName: 'Admin',
        password,
        countryOrRegion: 'US',
        acceptTerms: true
    });
    if (signupRes.status !== 201) {
        throw new Error(`Signup failed: ${signupRes.status} ${JSON.stringify(signupRes.data)}`);
    }
    const { companyId: cid } = signupRes.data.data;
    companyId = cid;
    logger.success('Signup successful');
    // 2. Fetch Verification Token from DB
    logger.subStep('Fetching verification token from DB...');
    // Wait a bit for DB to settle if needed, though usually instant
    await delay(1000);
    const tokenRecord = await prisma.verificationToken.findFirst({
        where: { email },
        orderBy: { created_at: 'desc' }
    });
    if (!tokenRecord) {
        throw new Error('Verification token not found in DB');
    }
    // 3. Verify
    logger.subStep(`Verifying with token: ${tokenRecord.token}`);
    const verifyRes = await axiosInstance.post('/api/auth/verify-company', {
        token: tokenRecord.token,
        companyId
    });
    if (verifyRes.status !== 200) {
        throw new Error(`Verification failed: ${verifyRes.status} ${JSON.stringify(verifyRes.data)}`);
    }
    // Extract user ID from verification response if available, or fetch later
    userId = verifyRes.data.data.user.id;
    logger.success('Verification successful');
    // 4. Login
    logger.subStep('Logging in...');
    const loginRes = await axiosInstance.post('/api/auth/login', {
        email,
        password
    });
    if (loginRes.status !== 200) {
        throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.data)}`);
    }
    // Capture Cookie
    const cookies = loginRes.headers['set-cookie'];
    if (cookies) {
        const rawCookie = cookies.find(c => c.startsWith('sessionId=')) || cookies[0];
        // Strip attributes (Path, HttpOnly, etc.) - only keep name=value
        sessionCookie = rawCookie.split(';')[0];
        logger.success(`Login successful, captured session cookie: ${sessionCookie}`);
    }
    else {
        throw new Error('No cookies received on login');
    }
    if (!userId)
        userId = loginRes.data.data.user.id;
    return { email, password };
}
async function verifyWalletRecharge() {
    logger.info('Starting Wallet Recharge Verification...');
    // 1. Create Checkout Session
    logger.subStep('Creating checkout session...');
    const createSessionRes = await axiosInstance.post('/api/integrations/stripe/create-checkout-session', {
        amount: 1000, // $1000
        description: 'Test Wallet Recharge'
    });
    if (createSessionRes.status !== 200) {
        logger.error('Create checkout session failed', createSessionRes.data);
        return false;
    }
    const { sessionId } = createSessionRes.data.data;
    logger.subStep(`Session created: ${sessionId}`);
    // 2. Mock Payment Success
    logger.subStep('Mocking payment success...');
    const mockPaymentRes = await axiosInstance.post('/api/integrations/stripe/mock-payment-success', {
        sessionId,
        amount: 1000 // Required by backend
    });
    if (mockPaymentRes.status !== 200) {
        logger.error('Mock payment failed', mockPaymentRes.data);
        return false;
    }
    logger.success('Wallet recharge verified');
    return true;
}
async function runRouteTests() {
    logger.info('Starting Route Verification...');
    // Dynamic IDs needed for tests
    let applicationId = null;
    let offerId = null;
    // 1. Job Creation (Needed for other tests)
    logger.subStep('Creating a Test Job...');
    const jobRes = await axiosInstance.post('/api/jobs', {
        title: 'Test Software Engineer',
        description: 'Test Description',
        department: 'Engineering',
        employmentType: 'FULL_TIME',
        location: 'New York, US', // Fixed: must be string, not object
        requirements: ['React', 'Node'],
        status: 'DRAFT'
    });
    if (jobRes.status === 201) {
        jobId = jobRes.data.data.id;
        logger.success(`Job created: ${jobId}`);
    }
    else {
        logger.error('Failed to create job', jobRes.data);
    }
    // Define Tests
    const tests = [
        // --- Auth & Profile ---
        { method: 'get', path: '/api/auth/me', desc: 'Get Current User' },
        // --- Payments (Check balance after recharge) ---
        // Note: Assuming this route exists and is migrated
        { method: 'get', path: '/api/admin/billing/settlements/stats', desc: 'Get Billing Stats' },
        // --- Job Operations ---
        ...(jobId ? [
            { method: 'get', path: `/api/jobs/${jobId}`, desc: 'Get Job Details' },
            { method: 'put', path: `/api/jobs/${jobId}`, body: { title: 'Updated Engineer' }, desc: 'Update Job' },
        ] : []),
        // --- Public Routes (No Auth Needed - but using auth is fine) ---
        { method: 'get', path: '/api/public/jobs/aggregations', desc: 'Get Job Aggregations' },
    ];
    // Execute Tests
    let passed = 0;
    let failed = 0;
    for (const test of tests) {
        try {
            logger.subStep(`Testing ${test.method.toUpperCase()} ${test.path} - ${test.desc}`);
            const res = await axiosInstance[test.method](test.path, test.body);
            const expected = test.expectedStatus || 200;
            // Allow 2xx status
            if (res.status >= 200 && res.status < 300) {
                // passed
                passed++;
            }
            else {
                logger.error(`Failed ${test.path}`, { status: res.status, data: res.data });
                failed++;
            }
        }
        catch (err) {
            logger.error(`Exception testing ${test.path}`, err);
            failed++;
        }
    }
    logger.info('Route Verification Complete', { passed, failed, total: tests.length });
}
// Main Execution
(async () => {
    try {
        await setupAxios();
        await signupAndVerify();
        await verifyWalletRecharge();
        await runRouteTests();
        // Cleanup?
    }
    catch (error) {
        logger.error('Fatal Error', error);
    }
    finally {
        logger.info('Cleaning up test data...');
        try {
            if (jobId) {
                logger.subStep(`Deleting tokens...`);
                await prisma.verificationToken.deleteMany({ where: { email: { contains: 'test-' } } });
                // Add other cleanup here if needed. 
                // Note: Cascading deletes might handle some, but explicit is safer for tests.
                // Since this runs against a real DB, be careful.
                // For now, we rely on the fact that these are test entities?
                // Or better, we explicitly delete what we created.
                // Deleting Job
                // Assuming we can delete via Prisma or API. API is safer if we want to test endpoints,
                // but for cleanup, Prisma is reliable if we have DB access.
                // But wait, the script might be running against a remote server's DB.
                // The script initializes PrismaClient locally.
                // Cleanup Job
                /*
                // Using API for cleanup if possible to verify DELETE route?
                if (authToken) {
                    await axiosInstance.delete(`/api/jobs/${jobId}`);
                }
                */
            }
            if (companyId) {
                logger.subStep(`Deleting Company ${companyId} and related data...`);
                // Hard delete for cleanup
                await prisma.user.deleteMany({ where: { company_id: companyId } });
                await prisma.company.delete({ where: { id: companyId } });
                logger.success('Cleanup complete');
            }
        }
        catch (cleanupError) {
            logger.error('Error during cleanup', cleanupError);
        }
        await prisma.$disconnect();
    }
})();
