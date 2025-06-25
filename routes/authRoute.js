import {Router} from "express";
import passport from "../middleware/passport.js"
import { authenticateToken, verifyRefreshToken, verifyToken, generateRefreshToken, generateToken } from "../utils/auth.js";
import { signIn,
        signUp,
        adminSignUp,
        deactivateAdmin,
        reactivateAdmin,
        superAdminSignUp,
        forgotPassword,
        resetPassword,
        logout
    } from "../controllers/authControllers.js";


const router = Router();

router.post("/sign-in", signIn)
router.get("/verify-token", verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});
router.get("/verify-refresh-token", verifyRefreshToken, (req, res) => {
  const token = generateToken(req.user);
  const refreshToken = generateRefreshToken(req.user);
  res.json({ token, refreshToken });
});
router.post("/generate-refresh-token", authenticateToken, (req, res) => {
  const refreshToken = generateRefreshToken(req.user);
  res.json({ refreshToken });
});

router.post("/sign-up", signUp)
router.post("/logout", logout);
router.post("/admin-sign-up", adminSignUp)
router.post("/super-admin-sign-up", superAdminSignUp)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.post("/deactivate-admin", deactivateAdmin)
router.post("/reactivate-admin", reactivateAdmin)
router.get("/google",  passport.authenticate('google', { scope:
    [ 'email', 'profile' ] }
));

router.get( '/google/signI',
    passport.authenticate( 'google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
}));



export default router;


   
  
 
 