import mongoose from "mongoose";
import { User, UserRole } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { PasswordResetToken } from "../model/passwordResetToken.js";
import { RefreshToken } from "../model/refreshTokenModel.js";
import { hashPassword, comparePassword, generateToken, generateRefreshToken, } from "../../utils/auth.js";
import emailService from "../../utils/email.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
const FRONTEND_BASE = process.env.FRONTEND_URL ?? "http://localhost:3000";
const RESET_PATH = process.env.PASSWORD_RESET_PATH ?? "reset-password";
const RESET_TOKEN_TTL_MS = Number(process.env.RESET_TOKEN_TTL_MS) || 60 * 60 * 1000;
const PERMANENT_SUPERADMIN_EMAIL = process.env.PERMANENT_SUPERADMIN_EMAIL ?? "ampleprinthub@gmail.com";
const generateRandomToken = () => crypto.randomBytes(32).toString("hex");
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
const isValidPhone = (phone) => {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
};
function sanitizeUser(user) {
    if (!user)
        return null;
    const obj = user.toObject?.() ?? user;
    const anyObj = { ...obj };
    delete anyObj.password;
    delete anyObj.__v;
    return anyObj;
}
function sanitizeProfile(profile) {
    if (!profile)
        return null;
    const obj = profile.toObject?.() ?? profile;
    const anyObj = { ...obj };
    delete anyObj.__v;
    return anyObj;
}
export async function signUpService(data) {
    const { firstName, lastName, userName, email, password, phoneNumber, address, } = data;
    if (!email || !password || !phoneNumber || !firstName || !userName) {
        throw new Error("All fields are required");
    }
    if (!isValidEmail(email)) {
        throw new Error("Please provide a valid email address");
    }
    if (!isValidPhone(phoneNumber)) {
        throw new Error("Please provide a valid phone number");
    }
    if (password.length < 5) {
        throw new Error("Password must be at least 5 characters");
    }
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
        throw new Error("An account with this email already exists");
    }
    const existingUserName = await Profile.findOne({ userName }).lean();
    if (existingUserName) {
        throw new Error("This username is already taken");
    }
    const hashedPassword = await hashPassword(password);
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const newUser = await User.create([
            {
                email,
                password: hashedPassword,
                role: UserRole.Customer,
                isActive: true,
            },
        ], { session }).then((res) => res[0]);
        const newProfile = await Profile.create([
            {
                userId: newUser._id,
                firstName,
                lastName,
                userName,
                phoneNumber,
                address,
            },
        ], { session }).then((res) => res[0]);
        await session.commitTransaction();
        session.endSession();
        await emailService.sendWelcomeEmail(email, firstName).catch(console.error);
        return {
            user: sanitizeUser(newUser),
            profile: sanitizeProfile(newProfile),
        };
    }
    catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}
export async function signInService(data) {
    const { email, password } = data;
    if (!email || !password) {
        throw new Error("Email and password are required");
    }
    if (!isValidEmail(email)) {
        throw new Error("Please provide a valid email address");
    }
    const user = await User.findOne({ email }).exec();
    if (!user || !user.isActive) {
        throw new Error("Invalid email or password");
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Invalid email or password");
    }
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile) {
        throw new Error("User profile not found");
    }
    const refreshToken = generateRefreshToken({
        userId: user._id,
        role: user.role,
        email: user.email,
    });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.findOneAndUpdate({ userId: user._id }, { token: refreshToken, expiresAt }, { upsert: true, new: true });
    const accessToken = generateToken({
        userId: user._id,
        role: user.role,
        email: user.email,
    });
    return {
        user: sanitizeUser(user),
        profile: sanitizeProfile(profile),
        accessToken,
        refreshToken,
    };
}
export async function refreshTokenService(refreshToken) {
    if (!refreshToken) {
        throw new Error("Refresh token is required");
    }
    const existing = await RefreshToken.findOne({ token: refreshToken });
    if (!existing) {
        throw new Error("Invalid refresh token");
    }
    if (existing.expiresAt < new Date()) {
        await RefreshToken.deleteOne({ token: refreshToken });
        throw new Error("Session expired, please sign in again");
    }
    const user = await User.findById(existing.userId);
    if (!user || !user.isActive) {
        throw new Error("Account no longer exists or has been deactivated");
    }
    const newRefreshToken = generateRefreshToken({
        userId: user._id,
        role: user.role,
        email: user.email,
    });
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.findOneAndUpdate({ userId: user._id }, { token: newRefreshToken, expiresAt: newExpiry }, { upsert: true, new: true });
    const newAccessToken = generateToken({
        userId: user._id,
        role: user.role,
        email: user.email,
    });
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
export async function logoutService(refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createAdminService(data, superAdmin) {
    const { firstName, lastName, userName, email, password, phoneNumber, address, } = data;
    if (!email ||
        !password ||
        !phoneNumber ||
        !firstName ||
        !lastName ||
        !userName) {
        throw new Error("All fields are required");
    }
    if (!isValidEmail(email)) {
        throw new Error("Please provide a valid email address");
    }
    if (!isValidPhone(phoneNumber)) {
        throw new Error("Please provide a valid phone number");
    }
    if (password.length < 5) {
        throw new Error("Password must be at least 5 characters");
    }
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
        throw new Error("An account with this email already exists");
    }
    const existingUserName = await Profile.findOne({ userName }).lean();
    if (existingUserName) {
        throw new Error("This username is already taken");
    }
    const hashedPassword = await hashPassword(password);
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const newUser = await User.create([
            {
                email,
                password: hashedPassword,
                role: UserRole.Admin,
                isActive: true,
            },
        ], { session }).then((res) => res[0]);
        const newProfile = await Profile.create([
            {
                userId: newUser._id,
                firstName,
                lastName,
                userName,
                phoneNumber,
                address,
            },
        ], { session }).then((res) => res[0]);
        await session.commitTransaction();
        session.endSession();
        const superAdminUser = await User.findOne({
            role: UserRole.SuperAdmin,
        }).lean();
        if (superAdminUser?.email) {
            await emailService
                .sendAdminNewOrder(superAdminUser.email, "N/A", `${firstName} ${lastName}`, email, 0, [
                {
                    productName: "Admin Account Creation",
                    quantity: 1,
                    price: 0,
                    total: 0,
                },
            ])
                .catch(console.error);
        }
        const token = generateRandomToken();
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        await PasswordResetToken.findOneAndUpdate({ userId: newUser._id }, { token, expiresAt }, { upsert: true, new: true });
        const resetUrl = `${FRONTEND_BASE}/${RESET_PATH}?token=${token}`;
        await emailService
            .sendPasswordReset(email, firstName, resetUrl)
            .catch(console.error);
        return {
            user: sanitizeUser(newUser),
            profile: sanitizeProfile(newProfile),
        };
    }
    catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}
export async function createSuperAdminService(data) {
    const { firstName, lastName, userName, email, password, phoneNumber, address, } = data;
    if (!email ||
        !password ||
        !phoneNumber ||
        !firstName ||
        !lastName ||
        !userName) {
        throw new Error("All fields are required");
    }
    if (!isValidEmail(email)) {
        throw new Error("Please provide a valid email address");
    }
    if (!isValidPhone(phoneNumber)) {
        throw new Error("Please provide a valid phone number");
    }
    if (password.length < 5) {
        throw new Error("Password must be at least 5 characters");
    }
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
        throw new Error("An account with this email already exists");
    }
    const existingUserName = await Profile.findOne({ userName }).lean();
    if (existingUserName) {
        throw new Error("This username is already taken");
    }
    const hashedPassword = await hashPassword(password);
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const newUser = await User.create([
            {
                email,
                password: hashedPassword,
                role: UserRole.SuperAdmin,
                isActive: true,
            },
        ], { session }).then((res) => res[0]);
        const newProfile = await Profile.create([
            {
                userId: newUser._id,
                firstName,
                lastName,
                userName,
                phoneNumber,
                address,
            },
        ], { session }).then((res) => res[0]);
        await session.commitTransaction();
        session.endSession();
        await emailService.sendWelcomeEmail(email, firstName).catch(console.error);
        return {
            user: sanitizeUser(newUser),
            profile: sanitizeProfile(newProfile),
        };
    }
    catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}
export async function deactivateAdminService(email) {
    if (!email) {
        throw new Error("Email is required");
    }
    if (!isValidEmail(email)) {
        throw new Error("Please provide a valid email address");
    }
    if (email === PERMANENT_SUPERADMIN_EMAIL) {
        throw new Error("Cannot deactivate the permanent superadmin account");
    }
    const superAdmin = await User.findOne({ role: UserRole.SuperAdmin }).lean();
    if (!superAdmin) {
        throw new Error("SuperAdmin not found");
    }
    const superAdminProfile = await Profile.findOne({
        userId: superAdmin._id,
    }).lean();
    if (!superAdminProfile) {
        throw new Error("SuperAdmin profile not found");
    }
    const user = await User.findOne({ email }).exec();
    if (!user) {
        throw new Error("Admin not found");
    }
    if (user.role === UserRole.Customer) {
        throw new Error("User is not an admin");
    }
    if (user.email === superAdmin.email) {
        throw new Error("Cannot deactivate yourself");
    }
    if (!user.isActive) {
        throw new Error("User is already deactivated");
    }
    user.isActive = false;
    await user.save();
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile) {
        throw new Error("Profile not found");
    }
    if (superAdmin.email) {
        await emailService
            .sendAdminNewOrder(superAdmin.email, "N/A", profile.userName, email, 0, [
            { productName: "Admin Deactivation", quantity: 1, price: 0, total: 0 },
        ])
            .catch(console.error);
    }
}
export async function reactivateAdminService(email) {
    if (!email) {
        throw new Error("Email is required");
    }
    if (!isValidEmail(email)) {
        throw new Error("Please provide a valid email address");
    }
    const superAdmin = await User.findOne({ role: UserRole.SuperAdmin }).lean();
    if (!superAdmin) {
        throw new Error("SuperAdmin not found");
    }
    const superAdminProfile = await Profile.findOne({
        userId: superAdmin._id,
    }).lean();
    if (!superAdminProfile) {
        throw new Error("SuperAdmin profile not found");
    }
    const user = await User.findOne({ email }).exec();
    if (!user) {
        throw new Error("Admin not found");
    }
    if (user.role === UserRole.Customer) {
        throw new Error("User is not an admin");
    }
    if (user.isActive) {
        throw new Error("User is already active");
    }
    user.isActive = true;
    await user.save();
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile) {
        throw new Error("Profile not found");
    }
    if (superAdmin.email) {
        await emailService
            .sendAdminNewOrder(superAdmin.email, "N/A", profile.userName, email, 0, [
            { productName: "Admin Reactivation", quantity: 1, price: 0, total: 0 },
        ])
            .catch(console.error);
    }
    await emailService
        .sendWelcomeEmail(email, profile.firstName)
        .catch(console.error);
}
export async function forgotPasswordService(email) {
    if (!email) {
        throw new Error("Email is required");
    }
    if (!isValidEmail(email)) {
        throw new Error("Please provide a valid email address");
    }
    const user = await User.findOne({ email }).exec();
    if (!user || !user.isActive) {
        throw new Error("If an account exists with this email, you will receive a password reset link");
    }
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile) {
        throw new Error("Profile not found");
    }
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await PasswordResetToken.findOneAndUpdate({ userId: user._id }, { token, expiresAt }, { upsert: true, new: true });
    const resetUrl = `${FRONTEND_BASE}/${RESET_PATH}?token=${token}`;
    await emailService
        .sendPasswordReset(email, profile.firstName, resetUrl)
        .catch(console.error);
    return {
        message: "If an account exists with this email, you will receive a password reset link",
    };
}
export async function effectForgotPassword(token, newPassword, confirmPassword) {
    if (!token) {
        throw new Error("Reset token is required");
    }
    if (!newPassword || !confirmPassword) {
        throw new Error("Password and confirmation are required");
    }
    if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
    }
    if (newPassword.length < 5) {
        throw new Error("Password must be at least 5 characters");
    }
    const resetToken = await PasswordResetToken.findOne({ token }).exec();
    if (!resetToken) {
        throw new Error("Invalid or expired reset token");
    }
    if (resetToken.expiresAt < new Date()) {
        await PasswordResetToken.deleteOne({ _id: resetToken._id }).catch(() => { });
        throw new Error("Reset token has expired");
    }
    const user = await User.findById(resetToken.userId).exec();
    if (!user || !user.isActive) {
        throw new Error("Account no longer exists or has been deactivated");
    }
    user.password = await hashPassword(newPassword);
    await user.save();
    await PasswordResetToken.deleteOne({ _id: resetToken._id }).catch(() => { });
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (profile) {
        const loginUrl = `${FRONTEND_BASE}/sign-in`;
        await emailService
            .sendPasswordReset(user.email, profile.firstName, loginUrl)
            .catch(console.error);
    }
    return {
        message: "Password reset successful. You can now sign in with your new password.",
    };
}
export async function resetPasswordService(userId, newPassword, confirmPassword) {
    if (!newPassword || !confirmPassword) {
        throw new Error("Password and confirmation are required");
    }
    if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
    }
    if (newPassword.length < 5) {
        throw new Error("Password must be at least 5 characters");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }
    user.password = await hashPassword(newPassword);
    await user.save();
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (profile) {
        const loginUrl = `${FRONTEND_BASE}/sign-in`;
        await emailService
            .sendPasswordReset(user.email, profile.firstName, loginUrl)
            .catch(console.error);
    }
    return {
        message: "Password reset successful. You can now sign in with your new password.",
    };
}
//# sourceMappingURL=authService.js.map