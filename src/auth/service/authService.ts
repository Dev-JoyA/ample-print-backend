import mongoose from "mongoose";
import { IUser, User, UserRole } from "../../users/model/userModel.js";
import { IProfile, Profile } from "../../users/model/profileModel.js";
import { PasswordResetToken } from "../model/passwordResetToken.js";
import { RefreshToken } from "../model/refreshTokenModel.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
} from "../../utils/auth.js";
import emailService from "../../utils/email.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const FRONTEND_BASE = process.env.FRONTEND_URL ?? "http://localhost:4001";
const RESET_PATH =
  process.env.PASSWORD_RESET_PATH ?? "api/v1/auth/effect-forgot-password";
const RESET_TOKEN_TTL_MS =
  Number(process.env.RESET_TOKEN_TTL_MS) || 60 * 60 * 1000;

const generateRandomToken = (): string =>
  crypto.randomBytes(32).toString("hex");

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

function sanitizeUser(user: IUser | null): Partial<IUser> | null {
  if (!user) return null;
  const obj = user.toObject?.() ?? user;
  const anyObj: any = { ...obj };
  delete anyObj.password;
  delete anyObj.__v;
  return anyObj;
}

function sanitizeProfile(profile: IProfile | null): Partial<IProfile> | null {
  if (!profile) return null;
  const obj = profile.toObject?.() ?? profile;
  const anyObj: any = { ...obj };
  delete anyObj.__v;
  return anyObj;
}

export async function signUpService(data: SignUpData) {
  const {
    firstName,
    lastName,
    userName,
    email,
    password,
    phoneNumber,
    address,
  } = data;

  if (!email || !password || !phoneNumber || !firstName || !userName) {
    throw new Error("All fields are required");
  }
  if (password.length < 5)
    throw new Error("Password must be at least 5 characters");
  if (phoneNumber.length < 7) throw new Error("Phone number is incomplete");

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) throw new Error("Email already exists");

  const existingUserName = await Profile.findOne({ userName }).lean();
  if (existingUserName) throw new Error("Username already exists");

  const hashedPassword = await hashPassword(password);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const newUser = await User.create(
      [
        {
          email,
          password: hashedPassword,
          role: UserRole.Customer,
          isActive: true,
        },
      ],
      { session },
    ).then((res) => res[0]);

    const newProfile = await Profile.create(
      [
        {
          userId: newUser._id,
          firstName,
          lastName,
          userName,
          phoneNumber,
          address,
        },
      ],
      { session },
    ).then((res) => res[0]);

    await session.commitTransaction();
    session.endSession();

    // ✅ FIXED: Use emailService correctly
    await emailService.sendWelcomeEmail(
      email,
      firstName // Using firstName instead of userName for more personal greeting
    ).catch(console.error);

    return {
      user: sanitizeUser(newUser),
      profile: sanitizeProfile(newProfile),
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function signInService(data: SignInData): Promise<AuthResponse> {
  const { email, password } = data;
  if (!email || !password) throw new Error("Email and password are required");

  const user = await User.findOne({ email }).exec();
  if (!user || !user.isActive)
    throw new Error("Account is inactive or not found");

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid password");

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

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
    user: sanitizeUser(user)!,
    profile: sanitizeProfile(profile)!,
    accessToken,
    refreshToken,
  };
}

export async function refreshTokenService(refreshToken: string) {
  if (!refreshToken) throw new Error("Refresh token is required");

  const existing = await RefreshToken.findOne({ token: refreshToken });
  if (!existing) throw new Error("Invalid refresh token");
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

export async function logoutService(refreshToken: string) {
  await RefreshToken.deleteOne({ token: refreshToken });
}

export async function createAdminService(
  data: SignUpData,
  superAdmin: AdminData,
) {
  const {
    firstName,
    lastName,
    userName,
    email,
    password,
    phoneNumber,
    address,
  } = data;

  if (
    !email ||
    !password ||
    !phoneNumber ||
    !firstName ||
    !lastName ||
    !userName
  ) {
    throw new Error("All fields are required");
  }
  if (password.length < 5)
    throw new Error("Password must be at least 5 characters");

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) throw new Error("Email already exists");

  const existingUserName = await Profile.findOne({ userName }).lean();
  if (existingUserName) throw new Error("Username already exists");

  const hashedPassword = await hashPassword(password);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const newUser = await User.create(
      [
        {
          email,
          password: hashedPassword,
          role: UserRole.Admin,
          isActive: true,
        },
      ],
      { session },
    ).then((res) => res[0]);

    const newProfile = await Profile.create(
      [
        {
          userId: newUser._id,
          firstName,
          lastName,
          userName,
          phoneNumber,
          address,
        },
      ],
      { session },
    ).then((res) => res[0]);

    await session.commitTransaction();
    session.endSession();

    // ✅ FIXED: Notify superadmin about new admin creation
    const superAdminUser = await User.findOne({ role: UserRole.SuperAdmin }).lean();
    if (superAdminUser?.email) {
      await emailService.sendAdminNewOrder(
        superAdminUser.email,
        "N/A", // No order number for admin creation
        `${firstName} ${lastName}`,
        email,
        0, // No amount
        [{ productName: "Admin Account Creation", quantity: 1, price: 0 }]
      ).catch(console.error);
    }

    // Send password reset email to new admin
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await PasswordResetToken.deleteMany({ userId: newUser._id }).catch(() => {});
    await PasswordResetToken.create({ userId: newUser._id, token, expiresAt });

    const resetUrl = `${FRONTEND_BASE}${RESET_PATH}?token=${token}`;
    
    // ✅ FIXED: Use emailService for password reset
    await emailService.sendPasswordReset(
      email,
      firstName,
      resetUrl
    ).catch(console.error);

    return {
      user: sanitizeUser(newUser),
      profile: sanitizeProfile(newProfile),
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function createSuperAdminService(data: SignUpData) {
  const {
    firstName,
    lastName,
    userName,
    email,
    password,
    phoneNumber,
    address,
  } = data;

  if (
    !email ||
    !password ||
    !phoneNumber ||
    !firstName ||
    !lastName ||
    !userName
  ) {
    throw new Error("All fields are required");
  }
  if (password.length < 5)
    throw new Error("Password must be at least 5 characters");

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) throw new Error("Email already exists");

  const existingUserName = await Profile.findOne({ userName }).lean();
  if (existingUserName) throw new Error("Username already exists");

  const hashedPassword = await hashPassword(password);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const newUser = await User.create(
      [
        {
          email,
          password: hashedPassword,
          role: UserRole.SuperAdmin,
          isActive: true,
        },
      ],
      { session },
    ).then((res) => res[0]);

    const newProfile = await Profile.create(
      [
        {
          userId: newUser._id,
          firstName,
          lastName,
          userName,
          phoneNumber,
          address,
        },
      ],
      { session },
    ).then((res) => res[0]);

    await session.commitTransaction();
    session.endSession();

    // ✅ FIXED: Use emailService for welcome email
    await emailService.sendWelcomeEmail(
      email,
      firstName
    ).catch(console.error);

    return {
      user: sanitizeUser(newUser),
      profile: sanitizeProfile(newProfile),
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function deactivateAdminService(email: string) {
  if (!email) throw new Error("Email is required");
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
  if (!user) throw new Error("Admin not found");
  if (user.role === UserRole.Customer) throw new Error("User is not an admin");
  if (user.email === superAdmin.email)
    throw new Error("Cannot deactivate yourself");
  if (!user.isActive) throw new Error("User is already deactivated");

  user.isActive = false;
  await user.save();

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  // ✅ FIXED: Use emailService for notifications
  if (superAdmin.email) {
    await emailService.sendAdminNewOrder(
      superAdmin.email,
      "N/A",
      profile.userName,
      email,
      0,
      [{ productName: "Admin Deactivation", quantity: 1, price: 0 }]
    ).catch(console.error);
  }

  // TODO: Add a specific email template for account deactivation
  // For now, using a generic email
  await emailService.sendPasswordReset(
    email,
    profile.userName,
    FRONTEND_BASE
  ).catch(console.error);
}

export async function reactivateAdminService(email: string) {
  if (!email) throw new Error("Email is required");

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
  if (!user) throw new Error("Admin not found");
  if (user.role === UserRole.Customer) throw new Error("User is not an admin");
  if (user.isActive) throw new Error("User is already active");

  user.isActive = true;
  await user.save();

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  // ✅ FIXED: Use emailService for notifications
  if (superAdmin.email) {
    await emailService.sendAdminNewOrder(
      superAdmin.email,
      "N/A",
      profile.userName,
      email,
      0,
      [{ productName: "Admin Reactivation", quantity: 1, price: 0 }]
    ).catch(console.error);
  }

  // TODO: Add a specific email template for account reactivation
  await emailService.sendWelcomeEmail(
    email,
    profile.firstName
  ).catch(console.error);
}

export async function forgotPasswordService(email: string) {
  if (!email) throw new Error("Email is required");

  const user = await User.findOne({ email }).exec();
  if (!user || !user.isActive)
    throw new Error("Account is inactive or not found");

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  const token = generateRandomToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await PasswordResetToken.deleteMany({ userId: user._id }).catch(() => {});
  await PasswordResetToken.create({ userId: user._id, token, expiresAt });

  const resetUrl = `${FRONTEND_BASE}${RESET_PATH}?token=${token}`;
  
  // ✅ FIXED: Use emailService for password reset
  await emailService.sendPasswordReset(
    email,
    profile.firstName,
    resetUrl
  ).catch(console.error);

  return { message: "Password reset email sent" };
}

export async function effectForgotPassword(
  token: string,
  newPassword: string,
  confirmPassword: string,
) {
  if (!token) throw new Error("Token is required");
  if (!newPassword || !confirmPassword)
    throw new Error("Passwords are required");
  if (newPassword !== confirmPassword)
    throw new Error("Passwords do not match");
  if (newPassword.length < 5)
    throw new Error("Password must be at least 5 characters");

  const resetToken = await PasswordResetToken.findOne({ token }).exec();
  if (!resetToken) throw new Error("Invalid or expired token");
  if (resetToken.expiresAt < new Date()) {
    await PasswordResetToken.deleteOne({ _id: resetToken._id }).catch(() => {});
    throw new Error("Token has expired");
  }

  const user = await User.findById(resetToken.userId).exec();
  if (!user || !user.isActive)
    throw new Error("Account is inactive or not found");

  user.password = await hashPassword(newPassword);
  await user.save();
  await PasswordResetToken.deleteOne({ _id: resetToken._id }).catch(() => {});

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (profile) {
    // ✅ FIXED: Use emailService for password reset confirmation
    await emailService.sendPasswordReset(
      user.email,
      profile.firstName,
      FRONTEND_BASE
    ).catch(console.error);
  }

  return { message: "Password reset successful" };
}

export async function resetPasswordService(
  userId: string,
  newPassword: string,
  confirmPassword: string,
) {
  if (!newPassword || !confirmPassword)
    throw new Error("Passwords are required");
  if (newPassword !== confirmPassword)
    throw new Error("Passwords do not match");
  if (newPassword.length < 5)
    throw new Error("Password must be at least 5 characters");

  const user = await User.findById(userId);

  if (!user) throw new Error("User not found");

  user.password = await hashPassword(newPassword);
  await user.save();

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (profile) {
    // ✅ FIXED: Use emailService for password reset confirmation
    await emailService.sendPasswordReset(
      user.email,
      profile.firstName,
      FRONTEND_BASE
    ).catch(console.error);
  }

  return { message: "Password reset successful" };
}