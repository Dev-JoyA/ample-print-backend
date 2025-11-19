import { IUser, User, UserRole } from "../models/userModel.js";
import { IProfile, Profile } from "../models/profileModel.js";
import { PasswordResetToken } from "../models/passwordResetToken.js";
import { hashPassword, comparePassword, generateToken, generateRefreshToken } from "../utils/auth.js";
import emails from "../utils/email.js";
import crypto from "crypto";

const generateRandomToken = () => crypto.randomBytes(32).toString("hex");

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
  user: IUser;
  profile: IProfile;
  accessToken: string;
  refreshToken: string;
}

// User Registration
export const signUpService = async (data: SignUpData): Promise<{ user: IUser; profile: IProfile }> => {
  const { firstName, lastName, userName, email, password, phoneNumber, address } = data;

  if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
    throw new Error("All fields are required");
  }

  // Check for existing email in User collection
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Email already exists");

  // Check for existing username in Profile collection
  const existingUserName = await Profile.findOne({ userName });
  if (existingUserName) throw new Error("Username already exists");

  if (password.length < 5) throw new Error("Password must be at least 5 characters");
  if (phoneNumber.length < 11) throw new Error("Phone number is incomplete");

  const hashedPassword = await hashPassword(password);

  // Create user
  const newUser = await User.create({
    email,
    password: hashedPassword,
    role: UserRole.Customer,
    isActive: true,
  } as IUser);

  // Create profile
  const newProfile = await Profile.create({
    userId: newUser._id,
    firstName,
    lastName,
    userName,
    phoneNumber,
    address,
  } as IProfile);

  // Send welcome email
  try {
    await emails(
      email,
      "Welcome to AMPLE PRINTHUB",
      "Welcome to AMPLE PRINTHUB",
      userName,
      "Welcome to AMPLE PRINTHUB! We are excited to have you on board. You can sign in and continue shopping with us.",
      "https://ampleprinthub.com"
    );
  } catch (emailError) {
    console.error("Email failed:", emailError);
  }

  return { user: newUser, profile: newProfile };
};

// Super Admin Registration
export const createSuperAdminService = async (data: SignUpData): Promise<{ user: IUser; profile: IProfile }> => {
  const { firstName, lastName, userName, email, password, phoneNumber, address } = data;

  if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
    throw new Error("All fields are required");
  }

  // Check for existing email
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Email already exists");

  // Check for existing username
  const existingUserName = await Profile.findOne({ userName });
  if (existingUserName) throw new Error("Username already exists");

  if (password.length < 5) throw new Error("Password must be at least 5 characters");

  const hashedPassword = await hashPassword(password);

  // Create super admin user
  const newUser = await User.create({
    email,
    password: hashedPassword,
    role: UserRole.SuperAdmin,
    isActive: true,
  } as IUser);

  // Create profile
  const newProfile = await Profile.create({
    userId: newUser._id,
    firstName,
    lastName,
    userName,
    phoneNumber,
    address,
  } as IProfile);

  // Send welcome email
  try {
    await emails(
      email,
      "Welcome Superadmin to AMPLE PRINTHUB",
      "Welcome Superadmin to AMPLE PRINTHUB",
      userName,
      `Welcome to the AMPLE PRINTHUB! You have been added as a superadmin. You can sign in with this email ${email} and this password ${password}. We are glad to have you in the team.`,
      "https://ampleprinthub.com"
    );
  } catch (emailError) {
    console.error("Email failed:", emailError);
  }

  return { user: newUser, profile: newProfile };
};

// Admin Registration
export const createAdminService = async (
  data: SignUpData,
  superAdmin: AdminData
): Promise<{ user: IUser; profile: IProfile }> => {
  const { firstName, lastName, userName, email, password, phoneNumber, address } = data;

  if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
    throw new Error("All fields are required");
  }

  // Check for existing email
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Email already exists");

  // Check for existing username
  const existingUserName = await Profile.findOne({ userName });
  if (existingUserName) throw new Error("Username already exists");

  if (password.length < 5) throw new Error("Password must be at least 5 characters");

  const hashedPassword = await hashPassword(password);

  // Create admin user
  const newUser = await User.create({
    email,
    password: hashedPassword,
    role: UserRole.Admin,
    isActive: true,
  } as IUser);

  // Create profile
  const newProfile = await Profile.create({
    userId: newUser._id,
    firstName,
    lastName,
    userName,
    phoneNumber,
    address,
  } as IProfile);

  // Send notification emails
  try {
    // Email to super admin
    await emails(
      superAdmin.email,
      "New Admin Created in AMPLE PRINTHUB",
      "New Admin Created in AMPLE PRINTHUB",
      superAdmin.userName,
      `A new admin has been created in AMPLE PRINTHUB. Admin details:\n\nEmail: ${email}\nUsername: ${userName}\n\nYou can now manage this admin from your dashboard.`,
      "https://ampleprinthub.com"
    );

    // Email to new admin
    await emails(
      email,
      "Welcome Admin to AMPLE PRINTHUB",
      "Welcome Admin to AMPLE PRINTHUB",
      userName,
      `Welcome to the AMPLE PRINTHUB! You have been added as an admin. You can sign in with this email ${email} and this password ${password}. We are glad to have you in the team.`,
      "https://ampleprinthub.com"
    );
  } catch (emailError) {
    console.error("Email failed:", emailError);
  }

  return { user: newUser, profile: newProfile };
};

// Sign In
export const signInService = async (data: SignInData): Promise<AuthResponse> => {
  const { email, password } = data;

  if (!email || !password) throw new Error("Email and password are required");

  // Find user by email
  const user = await User.findOne({ email });
  if (!user || !user.isActive) throw new Error("Account is inactive or not found");

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid password");

  // Find profile
  const profile = await Profile.findOne({ userId: user._id });
  if (!profile) throw new Error("Profile not found");

  // Create payload
  const payload = {
    userId: user.userId,
    email: user.email,
    userName: profile.userName,
    role: user.role,
  };

  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    user,
    profile,
    accessToken,
    refreshToken
  };
};

// Deactivate Admin
export const deactivateAdminService = async (
  email: string, 
  superAdmin: AdminData
): Promise<void> => {
  if (!email) throw new Error("Email is required");

  // Prevent deactivation of self
  if (email === superAdmin.email) {
    throw new Error("Cannot deactivate the permanent superadmin");
  }

  const user = await User.findOne({ email });
  if (!user) throw new Error("Admin not found");

  if (user.role === UserRole.Customer) {
    throw new Error("User is not an admin");
  }

  // Prevent self-deactivation
  if (user.email === superAdmin.email) {
    throw new Error("Cannot deactivate yourself");
  }

  if (user.isActive === false) {
    throw new Error("User is already deactivated");
  }

  user.isActive = false;
  await user.save();

  const profile = await Profile.findOne({ userId: user._id });
  if (!profile) throw new Error("Profile not found");

  // Send notification emails
  try {
    // Email to super admin
    await emails(
      superAdmin.email,
      "Admin Deactivated Successfully",
      "Admin Deactivated Successfully",
      superAdmin.userName,
      `Admin ${profile.userName} with email: ${email} has been deactivated in AMPLE PRINTHUB. \n\nYou can now manage this admin from your dashboard.`,
      "https://ampleprinthub.com"
    );

    // Email to deactivated admin
    await emails(
      email,
      "Account Deactivation Successful",
      "Account Deactivation Successful",
      profile.userName,
      `Your AMPLE PRINTHUB account has been deactivated by superadmin ${superAdmin.email}. If you believe this is a mistake, please contact support.`,
      "https://ampleprinthub.com"
    );
  } catch (emailError) {
    console.error("Email failed:", emailError);
  }

  console.log(`Admin ${email} deactivated by superadmin ${superAdmin.email}`);
};

// Reactivate Admin
export const reactivateAdminService = async (
  email: string, 
  superAdmin: AdminData
): Promise<void> => {
  if (!email) throw new Error("Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new Error("Admin not found");

  if (user.role === UserRole.Customer) {
    throw new Error("User is not an admin");
  }

  if (user.isActive === true) {
    throw new Error("User is already active");
  }

  user.isActive = true;
  await user.save();

  const profile = await Profile.findOne({ userId: user._id });
  if (!profile) throw new Error("Profile not found");

  // Send notification emails
  try {
    // Email to super admin
    await emails(
      superAdmin.email,
      "Admin Reactivation Successful",
      "Admin Reactivation Successful",
      superAdmin.userName,
      `Admin ${profile.userName} with email: ${email} has been reactivated in AMPLE PRINTHUB. \n\nYou can now manage this admin from your dashboard.`,
      "https://ampleprinthub.com"
    );

    // Email to reactivated admin
    await emails(
      email,
      "Account Reactivation",
      "Account Reactivation",
      profile.userName,
      `Your AMPLE PRINTHUB account has been reactivated by superadmin ${superAdmin.email}. You can now log in again.`,
      "https://ampleprinthub.com"
    );
  } catch (emailError) {
    console.error("Email failed:", emailError);
  }
};

// Forgot Password
export const forgotPasswordService = async (email: string): Promise<{ message: string; token: string }> => {
  if (!email) throw new Error("Email is required");

  const user = await User.findOne({ email });
  if (!user || !user.isActive) throw new Error("Account is inactive or not found");

  const profile = await Profile.findOne({ userId: user._id });
  if (!profile) throw new Error("Profile not found");

  const token = generateRandomToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  // Remove existing tokens
  await PasswordResetToken.deleteMany({ userId: user._id });

  // Create new token
  await PasswordResetToken.create({ 
    userId: user._id, 
    token, 
    expiresAt 
  });

  const hours = expiresAt.getHours().toString().padStart(2, '0');
  const minutes = expiresAt.getMinutes().toString().padStart(2, '0');
  const seconds = expiresAt.getSeconds().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;

  const resetUrl = `http://localhost:3001/reset-password?token=${token}`;

  try {
    await emails(
      email,
      "Password Reset Request",
      "Password Reset Request",
      profile.userName,
      `Hello ${profile.userName},\n\nYou requested a password reset for your AMPLE PRINTHUB ACCOUNT. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour at ${timeString}. If you did not request this, ignore this email.\n\nBest,\nAmple PrintHub`,
      "https://ampleprinthub.com"
    );
  } catch (emailError) {
    console.error("Failed to send password reset email:", emailError);
    throw new Error("Error sending reset email");
  }

  return { message: "Password reset email sent", token };
};

// Reset Password
export const resetPasswordService = async (
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ message: string }> => {
  if (!token) throw new Error("Token is required");
  if (!newPassword) throw new Error("A new password is required");
  if (!confirmPassword) throw new Error("Please confirm your password");
  if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
  if (newPassword.length < 5) throw new Error("New password must be at least 5 characters");

  const resetToken = await PasswordResetToken.findOne({ token });
  if (!resetToken) throw new Error("Invalid or expired token");

  if (resetToken.expiresAt < new Date()) {
    await PasswordResetToken.deleteOne({ _id: resetToken._id });
    throw new Error("Token has expired");
  }

  const user = await User.findById(resetToken.userId);
  if (!user || !user.isActive) throw new Error("Account is inactive or not found");

  const hashedPassword = await hashPassword(newPassword);
  user.password = hashedPassword;
  await user.save();

  await PasswordResetToken.deleteOne({ _id: resetToken._id });

  const profile = await Profile.findOne({ userId: user._id });
  if (!profile) throw new Error("Profile not found");

  try {
    await emails(
      user.email,
      "Password Reset Successful",
      "Password Reset Successful",
      profile.userName,
      `Hello ${profile.userName},\n\nYour AMPLE PRINTHUB ACCOUNT password has been successfully reset. If you did not perform this action, contact support immediately.\n\nBest,\nAmple PrintHub`,
      "https://ampleprinthub.com"
    );
  } catch (emailError) {
    console.error("Failed to send reset success email:", emailError);
  }

  return { message: "Password reset successful" };
};

// Get User by Email
export const getUserByEmailService = async (email: string): Promise<IUser | null> => {
  return await User.findOne({ email });
};

// Get Profile by User ID
export const getProfileByUserIdService = async (userId: string): Promise<IProfile | null> => {
  return await Profile.findOne({ userId });
};