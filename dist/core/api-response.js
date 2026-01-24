"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    static success(data, message) {
        return {
            success: true,
            data,
            message,
        };
    }
}
exports.ApiResponse = ApiResponse;
