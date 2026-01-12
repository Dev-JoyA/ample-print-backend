import { signUpService, signInService, createAdminService, createSuperAdminService, deactivateAdminService, reactivateAdminService, forgotPasswordService, effectForgotPassword, resetPasswordService, logoutService, refreshTokenService, } from "../service/authService.js";
export const signUpController = async (req, res) => {
    try {
        const data = req.body;
        const result = await signUpService(data);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to sign up" });
    }
};
// Sign in
export const signInController = async (req, res) => {
    try {
        const data = req.body;
        const result = await signInService(data);
        res.status(200).json(result);
    }
    catch (err) {
        const status = err.message.includes("password") ? 401 : 400;
        res.status(status).json({ error: err.message || "Failed to sign in" });
    }
};
// Logout
export const logoutController = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            return res.status(400).json({ error: "Refresh token is required" });
        await logoutService(refreshToken);
        res.status(200).json({ message: "Logged out successfully" });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to logout" });
    }
};
// Refresh access token
export const refreshTokenController = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            return res.status(400).json({ error: "Refresh token is required" });
        const tokens = await refreshTokenService(refreshToken);
        res.status(200).json(tokens);
    }
    catch (err) {
        res.status(401).json({ error: err.message || "Failed to refresh token" });
    }
};
// Create admin (by superadmin)
export const createAdminController = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const data = req.body;
        const superAdmin = req.user;
        const result = await createAdminService(data, superAdmin);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to create admin" });
    }
};
// Create superadmin (usually once)
export const createSuperAdminController = async (req, res) => {
    try {
        const data = req.body;
        const result = await createSuperAdminService(data);
        res.status(201).json(result);
    }
    catch (err) {
        res
            .status(400)
            .json({ error: err.message || "Failed to create superadmin" });
    }
};
// Deactivate admin
export const deactivateAdminController = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const { email } = req.body;
        const superAdmin = req.user;
        await deactivateAdminService(email);
        res.status(200).json({ message: "Admin deactivated successfully" });
    }
    catch (err) {
        const status = err.message.includes("not found") ? 404 : 400;
        res
            .status(status)
            .json({ error: err.message || "Failed to deactivate admin" });
    }
};
// Reactivate admin
export const reactivateAdminController = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const { email } = req.body;
        const superAdmin = req.user;
        await reactivateAdminService(email);
        res.status(200).json({ message: "Admin reactivated successfully" });
    }
    catch (err) {
        const status = err.message.includes("not found") ? 404 : 400;
        res
            .status(status)
            .json({ error: err.message || "Failed to reactivate admin" });
    }
};
// Forgot password
export const forgotPasswordController = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await forgotPasswordService(email);
        res.status(200).json(result);
    }
    catch (err) {
        res
            .status(400)
            .json({ error: err.message || "Failed to send password reset email" });
    }
};
// Reset password
export const effectForgotPasswordController = async (req, res) => {
    try {
        const token = req.query.token;
        const { newPassword, confirmPassword } = req.body;
        const result = await effectForgotPassword(token, newPassword, confirmPassword);
        res.status(200).json(result);
    }
    catch (err) {
        const status = err.message.includes("expired") || err.message.includes("Invalid")
            ? 400
            : 400;
        res
            .status(status)
            .json({ error: err.message || "Failed to effect password change" });
    }
};
export const resetPasswordController = async (req, res) => {
    try {
        const { userId } = req.params;
        const { newPassword, confirmPassword } = req.body;
        const result = await resetPasswordService(userId, newPassword, confirmPassword);
        res.status(200).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message || "failed to reset password" });
    }
};
//# sourceMappingURL=authController.js.map