import { Router, Request, Response } from "express";
import passport from "../middleware/passport.js";
import { authenticateToken, verifyRefreshToken, verifyToken, generateRefreshToken, generateToken } from "../utils/auth.js";
import {
  signUpController,
  signInController,
  createAdminController,
  createSuperAdminController,
  deactivateAdminController,
  reactivateAdminController,
  forgotPasswordController,
  resetPasswordController
} from "../controllers/authControllers.js";

const router = Router();

// ----------------------
// Public routes
// ----------------------
router.post("/sign-up", signUpController);
router.post("/sign-in", signInController);
router.post("/admin-sign-up", createAdminController);
router.post("/superadmin-sign-up", createSuperAdminController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);
router.post("/logout", (req: Request, res: Response) => {
  // optional: implement logout logic if needed
  res.status(200).json({ message: "Logged out successfully" });
});

// ----------------------
// Token verification / refresh
// ----------------------
router.get("/verify-token", verifyToken, (req: Request, res: Response) => {
  res.json({ valid: true, user: req.user });
});

router.get("/verify-refresh-token", verifyRefreshToken, (req: Request, res: Response) => {
  const token = generateToken(req.user!);
  const refreshToken = generateRefreshToken(req.user!);
  res.json({ token, refreshToken });
});

router.post("/generate-refresh-token", authenticateToken, (req: Request, res: Response) => {
  const refreshToken = generateRefreshToken(req.user!);
  res.json({ refreshToken });
});

// ----------------------
// Admin management (requires superadmin middleware)
// ----------------------
router.post("/deactivate-admin", deactivateAdminController);
router.post("/reactivate-admin", reactivateAdminController);

// ----------------------
// Google OAuth
// ----------------------
router.get("/google", passport.authenticate("google", { scope: ["email", "profile"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "/auth/google/success",
    failureRedirect: "/auth/google/failure"
  })
);

router.get("/google/success", (req: Request, res: Response) => {
  res.status(200).json({ message: "Google OAuth successful", user: req.user });
});

router.get("/google/failure", (req: Request, res: Response) => {
  res.status(401).json({ message: "Google OAuth failed" });
});

// ----------------------
// Export the router
// ----------------------
export default router;
