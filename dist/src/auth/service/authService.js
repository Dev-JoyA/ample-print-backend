import mongoose from "mongoose";
import { User, UserRole } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { PasswordResetToken } from "../model/passwordResetToken.js";
import { RefreshToken } from "../model/refreshTokenModel.js";
import { hashPassword, comparePassword, generateToken, generateRefreshToken, } from "../../utils/auth.js";
import emails from "../../utils/email.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
const FRONTEND_BASE = process.env.FRONTEND_BASE_URL ?? "http://localhost:4001";
const RESET_PATH = process.env.PASSWORD_RESET_PATH ?? "api/v1/auth/effect-forgot-password";
const RESET_TOKEN_TTL_MS = Number(process.env.RESET_TOKEN_TTL_MS) || 60 * 60 * 1000;
const generateRandomToken = () => crypto.randomBytes(32).toString("hex");
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
    if (password.length < 5)
        throw new Error("Password must be at least 5 characters");
    if (phoneNumber.length < 7)
        throw new Error("Phone number is incomplete");
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser)
        throw new Error("Email already exists");
    const existingUserName = await Profile.findOne({ userName }).lean();
    if (existingUserName)
        throw new Error("Username already exists");
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
        emails(email, "Welcome to AMPLE PRINTHUB", "Welcome to AMPLE PRINTHUB", userName, "We are excited to have you on board!", FRONTEND_BASE).catch(console.error);
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
    if (!email || !password)
        throw new Error("Email and password are required");
    const user = await User.findOne({ email }).exec();
    if (!user || !user.isActive)
        throw new Error("Account is inactive or not found");
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid)
        throw new Error("Invalid password");
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile)
        throw new Error("Profile not found");
    await RefreshToken.deleteMany({ userId: user._id });
    const refreshToken = generateRefreshToken({
        userId: user._id,
        role: user.role,
    });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
        userId: user._id,
        token: refreshToken,
        expiresAt,
    });
    const accessToken = generateToken({ userId: user._id, role: user.role });
    return {
        user: sanitizeUser(user),
        profile: sanitizeProfile(profile),
        accessToken,
        refreshToken,
    };
}
export async function refreshTokenService(refreshToken) {
    if (!refreshToken)
        throw new Error("Refresh token is required");
    const existing = await RefreshToken.findOne({ token: refreshToken });
    if (!existing)
        throw new Error("Invalid refresh token");
    if (existing.expiresAt < new Date()) {
        await RefreshToken.deleteOne({ token: refreshToken });
        throw new Error("Refresh token expired");
    }
    const user = await User.findById(existing.userId);
    if (!user || !user.isActive)
        throw new Error("User no longer exists or is deactivated");
    await RefreshToken.deleteMany({ userId: user._id });
    const newRefreshToken = generateRefreshToken({
        userId: user._id,
        role: user.role,
    });
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
        userId: user._id,
        token: newRefreshToken,
        expiresAt: newExpiry,
    });
    const newAccessToken = generateToken({ userId: user._id, role: user.role });
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
export async function logoutService(refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
}
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
    if (password.length < 5)
        throw new Error("Password must be at least 5 characters");
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser)
        throw new Error("Email already exists");
    const existingUserName = await Profile.findOne({ userName }).lean();
    if (existingUserName)
        throw new Error("Username already exists");
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
        const superAdmin = await User.findOne({ role: UserRole.SuperAdmin }).lean();
        if (!superAdmin) {
            throw new Error("SuperAdmin not found. Cannot create admin.");
        }
        const superAdminProfile = await Profile.findOne({
            userId: superAdmin._id,
        }).lean();
        if (!superAdmin.email) {
            console.warn(`Cannot send email to superadmin: Email not defined for user ${superAdminProfile?.userName}`);
        }
        else {
            emails(superAdmin.email, "New Admin Created", "A new admin has been created", superAdminProfile?.userName ?? "SuperAdmin", `Admin ${userName} (${email}) was just created.`, FRONTEND_BASE).catch((err) => console.error("Error sending email to superadmin:", err));
        }
        const token = generateRandomToken();
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        await PasswordResetToken.deleteMany({ userId: newUser._id }).catch(() => { });
        await PasswordResetToken.create({ userId: newUser._id, token, expiresAt });
        const resetUrl = `${FRONTEND_BASE}${RESET_PATH}?token=${token}`;
        emails(email, "Set Your Admin Password", "Set Your Admin Password", userName, `Welcome! Set your password here: ${resetUrl}`, FRONTEND_BASE).catch(console.error);
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
    if (password.length < 5)
        throw new Error("Password must be at least 5 characters");
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser)
        throw new Error("Email already exists");
    const existingUserName = await Profile.findOne({ userName }).lean();
    if (existingUserName)
        throw new Error("Username already exists");
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
        emails(email, "Welcome SuperAdmin", "Welcome SuperAdmin", userName, "Your SuperAdmin account has been created.", FRONTEND_BASE).catch(console.error);
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
    if (!email)
        throw new Error("Email is required");
    if (email === "ampleprinthub@gmail.com")
        throw new Error("Cannot deactivate the permanent superadmin");
    const superAdmin = await User.findOne({ role: UserRole.SuperAdmin }).lean();
    if (!superAdmin) {
        throw new Error("SuperAdmin not found. Cannot create admin.");
    }
    const superAdminProfile = await Profile.findOne({
        userId: superAdmin._id,
    }).lean();
    if (!superAdminProfile) {
        throw new Error("SuperAdmin profile not found");
    }
    const user = await User.findOne({ email }).exec();
    if (!user)
        throw new Error("Admin not found");
    if (user.role === UserRole.Customer)
        throw new Error("User is not an admin");
    if (user.email === superAdmin.email)
        throw new Error("Cannot deactivate yourself");
    if (!user.isActive)
        throw new Error("User is already deactivated");
    user.isActive = false;
    await user.save();
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile)
        throw new Error("Profile not found");
    emails(superAdmin.email, "Admin Deactivated Successfully", "Admin Deactivated Successfully", superAdminProfile.userName, `Admin ${profile.userName} with email ${email} has been deactivated.`, FRONTEND_BASE).catch(console.error);
    emails(email, "Account Deactivation Successful", "Account Deactivation Successful", profile.userName, `Your account has been deactivated by superadmin ${superAdmin.email}.`, FRONTEND_BASE).catch(console.error);
}
export async function reactivateAdminService(email) {
    if (!email)
        throw new Error("Email is required");
    const superAdmin = await User.findOne({ role: UserRole.SuperAdmin }).lean();
    if (!superAdmin) {
        throw new Error("SuperAdmin not found. Cannot create admin.");
    }
    const superAdminProfile = await Profile.findOne({
        userId: superAdmin._id,
    }).lean();
    if (!superAdminProfile) {
        throw new Error("SuperAdmin profile not found");
    }
    const user = await User.findOne({ email }).exec();
    if (!user)
        throw new Error("Admin not found");
    if (user.role === UserRole.Customer)
        throw new Error("User is not an admin");
    if (user.isActive)
        throw new Error("User is already active");
    user.isActive = true;
    await user.save();
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile)
        throw new Error("Profile not found");
    emails(superAdmin.email, "Admin Reactivation Successful", "Admin Reactivation Successful", superAdminProfile.userName, `Admin ${profile.userName} with email ${email} has been reactivated.`, FRONTEND_BASE).catch(console.error);
    emails(email, "Account Reactivation", "Account Reactivation", profile.userName, `Your account has been reactivated by superadmin ${superAdmin.email}. You can now log in again.`, FRONTEND_BASE).catch(console.error);
}
export async function forgotPasswordService(email) {
    if (!email)
        throw new Error("Email is required");
    const user = await User.findOne({ email }).exec();
    if (!user || !user.isActive)
        throw new Error("Account is inactive or not found");
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile)
        throw new Error("Profile not found");
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await PasswordResetToken.deleteMany({ userId: user._id }).catch(() => { });
    await PasswordResetToken.create({ userId: user._id, token, expiresAt });
    const resetUrl = `${FRONTEND_BASE}${RESET_PATH}?token=${token}`;
    emails(email, "Password Reset Request", "Password Reset Request", profile.userName, `Reset your password here: ${resetUrl}`, FRONTEND_BASE).catch(console.error);
    return { message: "Password reset email sent" };
}
export async function effectForgotPassword(token, newPassword, confirmPassword) {
    if (!token)
        throw new Error("Token is required");
    if (!newPassword || !confirmPassword)
        throw new Error("Passwords are required");
    if (newPassword !== confirmPassword)
        throw new Error("Passwords do not match");
    if (newPassword.length < 5)
        throw new Error("Password must be at least 5 characters");
    const resetToken = await PasswordResetToken.findOne({ token }).exec();
    if (!resetToken)
        throw new Error("Invalid or expired token");
    if (resetToken.expiresAt < new Date()) {
        await PasswordResetToken.deleteOne({ _id: resetToken._id }).catch(() => { });
        throw new Error("Token has expired");
    }
    const user = await User.findById(resetToken.userId).exec();
    if (!user || !user.isActive)
        throw new Error("Account is inactive or not found");
    user.password = await hashPassword(newPassword);
    await user.save();
    await PasswordResetToken.deleteOne({ _id: resetToken._id }).catch(() => { });
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (profile) {
        emails(user.email, "Password Reset Successful", "Password Reset Successful", profile.userName, `Your password has been reset successfully.`, FRONTEND_BASE).catch(console.error);
    }
    return { message: "Password reset successful" };
}
export async function resetPasswordService(userId, newPassword, confirmPassword) {
    if (!newPassword || !confirmPassword)
        throw new Error("Passwords are required");
    if (newPassword !== confirmPassword)
        throw new Error("Passwords do not match");
    if (newPassword.length < 5)
        throw new Error("Password must be at least 5 characters");
    const user = await User.findById(userId);
    if (!user)
        throw new Error("User not found");
    user.password = await hashPassword(newPassword);
    await user.save();
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (profile) {
        emails(user.email, "Password Reset Successful", "Password Reset Successful", profile.userName, `Your password has been reset successfully.`, FRONTEND_BASE).catch(console.error);
    }
    return { message: "Password reset successful" };
}
//# sourceMappingURL=authService.js.map