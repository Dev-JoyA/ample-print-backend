import { Router, Request, Response } from "express";
import passport from "../../config/passport.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  checkSuperAdmin,
  checkOwnership,
} from "../../middleware/authorization.js";
import {
  authenticateToken,
  verifyRefreshToken,
  verifyToken,
  generateRefreshToken,
  generateToken,
} from "../../utils/auth.js";
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

// ==================== PUBLIC ROUTES ====================
router.post("/sign-up", signUpController);
router.post("/sign-in", signInController);
router.post("/forgot-password", forgotPasswordController);
router.post("/effect-forgot-password", effectForgotPasswordController);
router.post("/logout", logoutController);
router.post("/refresh-token", refreshTokenController);

// ==================== SUPER ADMIN ONLY ROUTES ====================
router.post(
  "/admin-sign-up",
  authMiddleware,
  checkSuperAdmin,
  createAdminController,
);
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

// ==================== SUPER ADMIN CREATION (PROTECTED - ONCE) ====================
router.post("/superadmin-sign-up", createSuperAdminController);

// ==================== AUTHENTICATED ROUTES ====================
router.post(
  "/reset-password/:userId",
  authMiddleware,
  checkOwnership,
  resetPasswordController,
);

// ==================== TOKEN VERIFICATION ROUTES ====================
router.get("/verify-token", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  console.log("Verify token request received");
  console.log("Authorization header:", authHeader);
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("No token provided");
    return res.status(401).json({ 
      success: false,
      message: "No token provided" 
    });
  }

  const token = authHeader.split(" ")[1];
  console.log("Token extracted:", token.substring(0, 20) + "...");
  
  try {
    const decoded = verifyToken(token);
    console.log("Token verified successfully:", decoded);
    res.json({ 
      success: true,
      valid: true, 
      user: decoded 
    });
  } catch (error: any) {
    console.error("Token verification failed:", error.message);
    res.status(401).json({ 
      success: false,
      valid: false, 
      message: "Invalid token" 
    });
  }
});

router.get(
  "/verify-refresh-token",
  verifyRefreshToken,
  (req: Request, res: Response) => {
    const user = req.user as any;

    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({ 
      success: true,
      token, 
      refreshToken 
    });
  },
);

router.post(
  "/generate-refresh-token",
  authenticateToken,
  (req: Request, res: Response) => {
    const refreshToken = generateRefreshToken(req.user!);
    res.json({ 
      success: true,
      refreshToken 
    });
  },
);

// ==================== GOOGLE OAUTH ROUTES ====================
router.get(
  "/google",
  passport.authenticate("google", { 
    scope: ["email", "profile"],
    session: false, 
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/sign-in?error=google_auth_failed`);
      }

      const payload = {
        userId: user._id,
        email: user.email,
        role: user.role,
      };

      const token = generateToken(payload);
      const refreshToken = generateRefreshToken(payload);
      const role = user.role.toLowerCase();
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/google/callback?token=${token}&refresh=${refreshToken}&role=${role}`;

      return res.redirect(302, redirectUrl);
    } catch (error: any) {
      console.error("Google OAuth callback error:", error.message);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/sign-in?error=google_auth_failed`);
    }
  }
);

router.get("/google/failure", (req: Request, res: Response) => {
  res.status(401).json({ 
    success: false,
    message: "Google OAuth failed" 
  });
});

export default router;