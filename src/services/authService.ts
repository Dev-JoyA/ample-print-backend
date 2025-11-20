import mongoose from "mongoose";
import crypto from "crypto";
import { IUser, User, UserRole } from "../models/userModel.js";
import { IProfile, Profile } from "../models/profileModel.js";
import { PasswordResetToken } from "../models/passwordResetToken.js";
import { hashPassword, comparePassword, generateToken, generateRefreshToken } from "../utils/auth.js";
import emails from "../utils/email.js";

const FRONTEND_BASE = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";
const RESET_PATH = process.env.PASSWORD_RESET_PATH ?? "/auth/reset-password";
const RESET_TOKEN_TTL_MS = Number(process.env.RESET_TOKEN_TTL_MS) || 60 * 60 * 1000; // 1 hour

const generateRandomToken = (): string => crypto.randomBytes(32).toString("hex");

export interface SignUpData {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
  phoneNumber: string;
  address?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AdminData {
  email: string;
  userName: string;
}

export interface AuthResponse {
  user: Partial<IUser>;
  profile: Partial<IProfile>;
  accessToken: string;
  refreshToken: string;
}

/* ---------- helpers ---------- */
function sanitizeUser(user: IUser | null): Partial<IUser> | null {
  if (!user) return null;
  const obj = (user.toObject && typeof user.toObject === "function") ? user.toObject() : user;
  // remove sensitive fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyObj: any = { ...obj };
  delete anyObj.password;
  delete anyObj.__v;
  return anyObj;
}

function sanitizeProfile(profile: IProfile | null): Partial<IProfile> | null {
  if (!profile) return null;
  const obj = (profile.toObject && typeof profile.toObject === "function") ? profile.toObject() : profile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyObj: any = { ...obj };
  delete anyObj.__v;
  return anyObj;
}

/* ---------- services ---------- */

export async function signUpService(data: SignUpData) {
  const { firstName, lastName, userName, email, password, phoneNumber, address } = data;

  if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
    throw new Error("All fields are required");
  }
  if (password.length < 5) throw new Error("Password must be at least 5 characters");
  if (phoneNumber.length < 7) throw new Error("Phone number is incomplete");

  // uniqueness checks
  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) throw new Error("Email already exists");

  const existingUserName = await Profile.findOne({ userName }).lean();
  if (existingUserName) throw new Error("Username already exists");

  const hashedPassword = await hashPassword(password);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const createdUsers = await User.create(
      [{ email, password: hashedPassword, role: UserRole.Customer, isActive: true }],
      { session }
    );
    const newUser = createdUsers[0];

    const createdProfiles = await Profile.create(
      [{
        userId: newUser._id,
        firstName,
        lastName,
        userName,
        phoneNumber,
        address
      }],
      { session }
    );
    const newProfile = createdProfiles[0];

    await session.commitTransaction();
    session.endSession();

    // Welcome email (non-blocking)
    emails(
      email,
      "Welcome to AMPLE PRINTHUB",
      "Welcome to AMPLE PRINTHUB",
      userName,
      "Welcome to AMPLE PRINTHUB! We are excited to have you on board.",
      FRONTEND_BASE
    ).catch((e) => console.error("Welcome email failed:", e));

    return {
      user: sanitizeUser(newUser),
      profile: sanitizeProfile(newProfile)
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function createAdminService(data: SignUpData, superAdmin: AdminData) {
  const { firstName, lastName, userName, email, password, phoneNumber, address } = data;

  if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
    throw new Error("All fields are required");
  }
  if (password.length < 5) throw new Error("Password must be at least 5 characters");

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) throw new Error("Email already exists");

  const existingUserName = await Profile.findOne({ userName }).lean();
  if (existingUserName) throw new Error("Username already exists");

  const hashedPassword = await hashPassword(password);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const createdUsers = await User.create(
      [{ email, password: hashedPassword, role: UserRole.Admin, isActive: true }],
      { session }
    );
    const newUser = createdUsers[0];

    const createdProfiles = await Profile.create(
      [{
        userId: newUser._id,
        firstName,
        lastName,
        userName,
        phoneNumber,
        address
      }],
      { session }
    );
    const newProfile = createdProfiles[0];

    await session.commitTransaction();
    session.endSession();

    // notify superadmin (non-blocking)
    emails(
      superAdmin.email,
      "New Admin Created in AMPLE PRINTHUB",
      "New Admin Created in AMPLE PRINTHUB",
      superAdmin.userName,
      `A new admin has been created: ${email} (username: ${userName}).`,
      FRONTEND_BASE
    ).catch((e) => console.error("Notify superadmin failed:", e));

    // create reset token & email admin a secure link
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await PasswordResetToken.deleteMany({ userId: newUser._id }).catch(() => {});
    await PasswordResetToken.create({ userId: newUser._id, token, expiresAt });

    const resetUrl = `${FRONTEND_BASE}${RESET_PATH}?token=${token}`;
    emails(
      email,
      "Welcome Admin to AMPLE PRINTHUB",
      "Welcome Admin to AMPLE PRINTHUB",
      userName,
      `Welcome! Please set your password using this secure link: ${resetUrl}`,
      FRONTEND_BASE
    ).catch((e) => console.error("Admin email failed:", e));

    return { user: sanitizeUser(newUser), profile: sanitizeProfile(newProfile) };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function createSuperAdminService(data: SignUpData) {
  // same as createAdmin but role = SuperAdmin and notify accordingly
  return createAdminService(data, { email: "ampleprinthub@gmail.com", userName: "superadmin" } as AdminData);
}

export async function signInService(data: SignInData): Promise<AuthResponse> {
  const { email, password } = data;
  if (!email || !password) throw new Error("Email and password are required");

  const user = await User.findOne({ email }).exec();
  if (!user || !user.isActive) throw new Error("Account is inactive or not found");

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid password");

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  const payload = {
    userId: user.userId, // your UUID field
    email: user.email,
    userName: profile.userName,
    role: user.role,
  };

  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    user: sanitizeUser(user)!,
    profile: sanitizeProfile(profile)!,
    accessToken,
    refreshToken,
  };
}

export async function deactivateAdminService(email: string, superAdmin: AdminData) {
  if (!email) throw new Error("Email is required");
  if (email === "ampleprinthub@gmail.com") throw new Error("Cannot deactivate the permanent superadmin");

  const user = await User.findOne({ email }).exec();
  if (!user) throw new Error("Admin not found");
  if (user.role === UserRole.Customer) throw new Error("User is not an admin");
  if (user.email === superAdmin.email) throw new Error("Cannot deactivate yourself");
  if (!user.isActive) throw new Error("User is already deactivated");

  user.isActive = false;
  await user.save();

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  // notifications (non-blocking)
  emails(
    superAdmin.email,
    "Admin Deactivated Successfully",
    "Admin Deactivated Successfully",
    superAdmin.userName,
    `Admin ${profile.userName} with email ${email} has been deactivated.`,
    FRONTEND_BASE
  ).catch((e) => console.error("Notify superadmin failed:", e));

  emails(
    email,
    "Account Deactivation Successful",
    "Account Deactivation Successful",
    profile.userName,
    `Your account has been deactivated by superadmin ${superAdmin.email}.`,
    FRONTEND_BASE
  ).catch((e) => console.error("Notify deactivated admin failed:", e));
}

export async function reactivateAdminService(email: string, superAdmin: AdminData) {
  if (!email) throw new Error("Email is required");

  const user = await User.findOne({ email }).exec();
  if (!user) throw new Error("Admin not found");
  if (user.role === UserRole.Customer) throw new Error("User is not an admin");
  if (user.isActive) throw new Error("User is already active");

  user.isActive = true;
  await user.save();

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  emails(
    superAdmin.email,
    "Admin Reactivation Successful",
    "Admin Reactivation Successful",
    superAdmin.userName,
    `Admin ${profile.userName} with email ${email} has been reactivated.`,
    FRONTEND_BASE
  ).catch((e) => console.error("Notify superadmin failed:", e));

  emails(
    email,
    "Account Reactivation",
    "Account Reactivation",
    profile.userName,
    `Your account has been reactivated by superadmin ${superAdmin.email}. You can now log in again.`,
    FRONTEND_BASE
  ).catch((e) => console.error("Notify reactivated admin failed:", e));
}

export async function forgotPasswordService(email: string) {
  if (!email) throw new Error("Email is required");

  const user = await User.findOne({ email }).exec();
  if (!user || !user.isActive) throw new Error("Account is inactive or not found");

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  const token = generateRandomToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await PasswordResetToken.deleteMany({ userId: user._id }).catch(() => {});
  await PasswordResetToken.create({ userId: user._id, token, expiresAt });

  const resetUrl = `${FRONTEND_BASE}${RESET_PATH}?token=${token}`;

  emails(
    email,
    "Password Reset Request",
    "Password Reset Request",
    profile.userName,
    `Hello ${profile.userName},\n\nYou requested a password reset. Use this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    FRONTEND_BASE
  ).catch((e) => console.error("Failed to send password reset email:", e));

  return { message: "Password reset email sent" };
}

export async function resetPasswordService(token: string, newPassword: string, confirmPassword: string) {
  if (!token) throw new Error("Token is required");
  if (!newPassword) throw new Error("A new password is required");
  if (!confirmPassword) throw new Error("Please confirm your password");
  if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
  if (newPassword.length < 5) throw new Error("New password must be at least 5 characters");

  const resetToken = await PasswordResetToken.findOne({ token }).exec();
  if (!resetToken) throw new Error("Invalid or expired token");

  if (resetToken.expiresAt < new Date()) {
    await PasswordResetToken.deleteOne({ _id: resetToken._id }).catch(() => {});
    throw new Error("Token has expired");
  }

  const user = await User.findById(resetToken.userId).exec();
  if (!user || !user.isActive) throw new Error("Account is inactive or not found");

  user.password = await hashPassword(newPassword);
  await user.save();

  await PasswordResetToken.deleteOne({ _id: resetToken._id }).catch(() => {});

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (profile) {
    emails(
      user.email,
      "Password Reset Successful",
      "Password Reset Successful",
      profile.userName,
      `Hello ${profile.userName},\n\nYour password has been reset. If you did not perform this action, contact support immediately.`,
      FRONTEND_BASE
    ).catch((e) => console.error("Failed to send reset success email:", e));
  }

  return { message: "Password reset successful" };
}

/* ---------- simple getters ---------- */
export async function getUserByEmailService(email: string) {
  return User.findOne({ email }).exec();
}

export async function getProfileByUserIdService(userId: string) {
  return Profile.findOne({ userId }).exec();
}
