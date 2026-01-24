"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const controller_1 = require("../../core/controller");
class UserController extends controller_1.BaseController {
    constructor(userService = userService) {
        super();
        this.userService = userService;
        this.getMe = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    return res.status(401).json({ success: false, error: 'Not authenticated' });
                }
                const user = await this.userService.getProfile(userId);
                return this.sendSuccess(res, user);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.changePassword = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    return res.status(401).json({ success: false, error: 'Not authenticated' });
                }
                const { oldPassword, newPassword } = req.body;
                if (!oldPassword || !newPassword) {
                    return res.status(400).json({ success: false, error: 'Old and new passwords are required' });
                }
                await this.userService.changePassword(userId, oldPassword, newPassword);
                return this.sendSuccess(res, { message: 'Password changed successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.UserController = UserController;
exports.userController = new UserController();
