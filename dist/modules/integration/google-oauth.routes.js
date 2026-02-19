"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const google_oauth_service_1 = require("./google-oauth.service");
const env_1 = require("../../config/env");
const router = (0, express_1.Router)();
/**
 * GET /api/auth/google/connect
 * Redirects user to Google OAuth consent screen.
 */
router.get('/connect', auth_middleware_1.authenticate, (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const authUrl = google_oauth_service_1.googleOAuthService.getAuthUrl(req.user.id, req.user.companyId);
    return res.redirect(authUrl);
});
/**
 * GET /api/auth/google/callback
 * Google OAuth callback — exchanges code for tokens and stores them.
 */
router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) {
        console.error('[GoogleOAuth] OAuth error:', error);
        return res.redirect(`${env_1.env.ATS_FRONTEND_URL}?google_calendar=error&reason=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
        return res.redirect(`${env_1.env.ATS_FRONTEND_URL}?google_calendar=error&reason=missing_params`);
    }
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        const { userId, companyId } = decoded;
        if (!userId || !companyId) {
            return res.redirect(`${env_1.env.ATS_FRONTEND_URL}?google_calendar=error&reason=invalid_state`);
        }
        await google_oauth_service_1.googleOAuthService.handleCallback(code, userId, companyId);
        return res.redirect(`${env_1.env.ATS_FRONTEND_URL}?google_calendar=connected`);
    }
    catch (err) {
        console.error('[GoogleOAuth] Callback error:', err);
        return res.redirect(`${env_1.env.ATS_FRONTEND_URL}?google_calendar=error&reason=server_error`);
    }
});
/**
 * GET /api/auth/google/status
 * Returns whether the current user's Google Calendar is connected.
 */
router.get('/status', auth_middleware_1.authenticate, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const status = await google_oauth_service_1.googleOAuthService.isUserConnected(req.user.id, req.user.companyId);
        return res.json({ success: true, data: status });
    }
    catch (err) {
        console.error('[GoogleOAuth] Status error:', err);
        return res.status(500).json({ success: false, error: 'Failed to check status' });
    }
});
/**
 * POST /api/auth/google/interviewers-availability
 * Body: { interviewerIds: string[], timeMin: string, timeMax: string }
 * Returns free/busy data for each interviewer.
 */
router.post('/interviewers-availability', auth_middleware_1.authenticate, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const { interviewerIds, timeMin, timeMax } = req.body;
    if (!Array.isArray(interviewerIds) || !timeMin || !timeMax) {
        return res.status(400).json({ success: false, error: 'interviewerIds, timeMin, and timeMax are required' });
    }
    try {
        const result = await google_oauth_service_1.googleOAuthService.getFreeBusy(interviewerIds, req.user.companyId, new Date(timeMin), new Date(timeMax));
        return res.json({ success: true, data: result });
    }
    catch (err) {
        console.error('[GoogleOAuth] FreeBusy error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch availability' });
    }
});
/**
 * POST /api/auth/google/interviewers-status
 * Body: { interviewerIds: string[] }
 * Returns connection status for each interviewer.
 */
router.post('/interviewers-status', auth_middleware_1.authenticate, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const { interviewerIds } = req.body;
    if (!Array.isArray(interviewerIds)) {
        return res.status(400).json({ success: false, error: 'interviewerIds must be an array' });
    }
    try {
        const results = {};
        for (const userId of interviewerIds) {
            results[userId] = await google_oauth_service_1.googleOAuthService.isUserConnected(userId, req.user.companyId);
        }
        return res.json({ success: true, data: results });
    }
    catch (err) {
        console.error('[GoogleOAuth] Interviewers status error:', err);
        return res.status(500).json({ success: false, error: 'Failed to check statuses' });
    }
});
exports.default = router;
