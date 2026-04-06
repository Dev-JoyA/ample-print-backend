import { signUpService, signInService, createAdminService, createSuperAdminService, deactivateAdminService, reactivateAdminService, forgotPasswordService, effectForgotPassword, resetPasswordService, logoutService, refreshTokenService, } from "../service/authService.js";
export const signUpController = async (req, res) => {
    try {
        const data = req.body;
        const result = await signUpService(data);
        res.status(201).json({
            success: true,
            message: "Account created successfully",
            data: result
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            error: err.message || "Failed to sign up"
        });
    }
};
export const signInController = async (req, res) => {
    try {
        const data = req.body;
        const result = await signInService(data);
        res.status(200).json({
            success: true,
            message: "Signed in successfully",
            data: result
        });
    }
    catch (err) {
        const status = err.message.includes("password") ? 401 : 400;
        res.status(status).json({
            success: false,
            error: err.message || "Failed to sign in"
        });
    }
};
export const logoutController = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: "Refresh token is required"
            });
        }
        await logoutService(refreshToken);
        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            error: err.message || "Failed to logout"
        });
    }
};
export const refreshTokenController = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: "Refresh token is required"
            });
        }
        const tokens = await refreshTokenService(refreshToken);
        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: tokens
        });
    }
    catch (err) {
        res.status(401).json({
            success: false,
            error: err.message || "Failed to refresh token"
        });
    }
};
export const createAdminController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized"
            });
        }
        const data = req.body;
        const superAdmin = req.user;
        const result = await createAdminService(data, superAdmin);
        res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: result
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            error: err.message || "Failed to create admin"
        });
    }
};
export const createSuperAdminController = async (req, res) => {
    try {
        const data = req.body;
        const result = await createSuperAdminService(data);
        res.status(201).json({
            success: true,
            message: "Super admin created successfully",
            data: result
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            error: err.message || "Failed to create superadmin"
        });
    }
};
export const deactivateAdminController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized"
            });
        }
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required"
            });
        }
        await deactivateAdminService(email);
        res.status(200).json({
            success: true,
            message: "Admin deactivated successfully"
        });
    }
    catch (err) {
        const status = err.message.includes("not found") ? 404 : 400;
        res.status(status).json({
            success: false,
            error: err.message || "Failed to deactivate admin"
        });
    }
};
export const reactivateAdminController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized"
            });
        }
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required"
            });
        }
        await reactivateAdminService(email);
        res.status(200).json({
            success: true,
            message: "Admin reactivated successfully"
        });
    }
    catch (err) {
        const status = err.message.includes("not found") ? 404 : 400;
        res.status(status).json({
            success: false,
            error: err.message || "Failed to reactivate admin"
        });
    }
};
export const forgotPasswordController = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required"
            });
        }
        const result = await forgotPasswordService(email);
        res.status(200).json({
            success: true,
            message: result.message
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            error: err.message || "Failed to send password reset email"
        });
    }
};
export const effectForgotPasswordController = async (req, res) => {
    try {
        const token = req.query.token;
        const { newPassword, confirmPassword } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: "Reset token is required"
            });
        }
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: "New password and confirm password are required"
            });
        }
        const result = await effectForgotPassword(token, newPassword, confirmPassword);
        res.status(200).json({
            success: true,
            message: result.message
        });
    }
    catch (err) {
        const status = err.message.includes("expired") || err.message.includes("Invalid") ? 400 : 400;
        res.status(status).json({
            success: false,
            error: err.message || "Failed to reset password"
        });
    }
};
export const resetPasswordController = async (req, res) => {
    try {
        const { userId } = req.params;
        const { newPassword, confirmPassword } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "User ID is required"
            });
        }
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: "New password and confirm password are required"
            });
        }
        const result = await resetPasswordService(userId, newPassword, confirmPassword);
        res.status(200).json({
            success: true,
            message: result.message
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            error: err.message || "Failed to reset password"
        });
    }
};
//# sourceMappingURL=authController.js.map