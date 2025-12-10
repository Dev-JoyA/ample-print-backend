import { Router, Request, Response } from "express";
import passport from "../middleware/passport.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  checkSuperAdmin,
  checkOwnership,
} from "../middleware/authorization.js";
import {
  authenticateToken,
  verifyRefreshToken,
  verifyToken,
  generateRefreshToken,
  generateToken,
} from "../utils/auth.js";
import {
  signUpController,
  signInController,
  createAdminController,
  createSuperAdminController,
  deactivateAdminController,
  reactivateAdminController,
  forgotPasswordController,
  effectForgotPasswordController,
  resetPasswordController,
  refreshTokenController,
  logoutController,
} from "../controller/authController.js";

const router = Router();

router.post("/sign-up", signUpController);
router.post("/sign-in", signInController);
router.post(
  "/admin-sign-up",
  authMiddleware,
  checkSuperAdmin,
  createAdminController,
);
router.post("/superadmin-sign-up", createSuperAdminController);
router.post(
  "/deactivate-admin",
  authMiddleware,
  checkSuperAdmin,
  deactivateAdminController,
);
router.post(
  "/reactivate-admin",
  authMiddleware,
  checkSuperAdmin,
  reactivateAdminController,
);
router.post("/forgot-password", forgotPasswordController);
router.post("/effect-forgot-password", effectForgotPasswordController);
router.post("/logout", logoutController);
router.post("/refresh-token", refreshTokenController);
router.post(
  "/reset-password/:userId",
  authMiddleware,
  checkOwnership,
  resetPasswordController,
);

router.get("/verify-token", verifyToken, (req: Request, res: Response) => {
  res.json({ valid: true, user: req.user });
});

router.get(
  "/verify-refresh-token",
  verifyRefreshToken,
  (req: Request, res: Response) => {
    const token = generateToken(req.user!);
    const refreshToken = generateRefreshToken(req.user!);
    res.json({ token, refreshToken });
  },
);

router.post(
  "/generate-refresh-token",
  authenticateToken,
  (req: Request, res: Response) => {
    const refreshToken = generateRefreshToken(req.user!);
    res.json({ refreshToken });
  },
);

// ----------------------
// Google OAuth
// ----------------------
router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "/api/v1/auth/google/success",
    failureRedirect: "/api/v1/auth/google/failure",
  }),
);

router.get("/google/success", (req: Request, res: Response) => {
  const user = req.user;
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res
    .status(200)
    .json({ message: "Google OAuth successful", token, refreshToken, user });
});

router.get("/google/failure", (req: Request, res: Response) => {
  res.status(401).json({ message: "Google OAuth failed" });
});

export default router;
