import { Request, Response } from "express";
import {
  signUpService,
  signInService,
  createAdminService,
  createSuperAdminService,
  deactivateAdminService,
  reactivateAdminService,
  forgotPasswordService,
  resetPasswordService,
} from "../services/authService.js";

import { SignUpData, SignInData, AdminData } from "../services/authService.js";

// ------------------- CONTROLLERS -------------------

// Sign up a new user
export const signUpController = async (req: Request, res: Response) => {
  try {
    const data: SignUpData = req.body;
    const result = await signUpService(data);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to sign up" });
  }
};

// Sign in
export const signInController = async (req: Request, res: Response) => {
  try {
    const data: SignInData = req.body;
    const result = await signInService(data);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to sign in" });
  }
};

// Create admin (by superadmin)
export const createAdminController = async (req: Request, res: Response) => {
  try {
    const data: SignUpData = req.body;
    const superAdmin: AdminData = req.user as AdminData; // assuming you attach superadmin info via auth middleware
    const result = await createAdminService(data, superAdmin);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create admin" });
  }
};

// Create superadmin (usually once)
export const createSuperAdminController = async (req: Request, res: Response) => {
  try {
    const data: SignUpData = req.body;
    const result = await createSuperAdminService(data);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create superadmin" });
  }
};

// Deactivate admin
export const deactivateAdminController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const superAdmin: AdminData = req.user as AdminData;
    await deactivateAdminService(email, superAdmin);
    res.status(200).json({ message: "Admin deactivated successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to deactivate admin" });
  }
};

// Reactivate admin
export const reactivateAdminController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const superAdmin: AdminData = req.user as AdminData;
    await reactivateAdminService(email, superAdmin);
    res.status(200).json({ message: "Admin reactivated successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to reactivate admin" });
  }
};

// Forgot password
export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const result = await forgotPasswordService(email);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to send password reset email" });
  }
};

// Reset password
export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    const result = await resetPasswordService(token, newPassword, confirmPassword);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to reset password" });
  }
};
