"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const service_1 = require("../../core/service");
const user_repository_1 = require("./user.repository");
const password_1 = require("../../utils/password");
const http_exception_1 = require("../../core/http-exception");
class UserService extends service_1.BaseService {
    constructor(repository = user_repository_1.userRepository) {
        super();
        this.repository = repository;
    }
    async getProfile(userId) {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new http_exception_1.HttpException(404, 'User not found');
        }
        return user;
    }
    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new http_exception_1.HttpException(404, 'User not found');
        }
        const isValid = await (0, password_1.comparePassword)(oldPassword, user.passwordHash);
        if (!isValid) {
            throw new http_exception_1.HttpException(400, 'Invalid current password');
        }
        const newHash = await (0, password_1.hashPassword)(newPassword);
        await this.repository.updatePassword(userId, newHash);
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
