"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
const api_response_1 = require("./api-response");
class BaseController {
    sendSuccess(res, data, message) {
        return res.json(api_response_1.ApiResponse.success(data, message));
    }
    sendError(res, error) {
        if (error instanceof Error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}
exports.BaseController = BaseController;
