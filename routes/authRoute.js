import {Router} from "express";
import passport from "../middleware/passport.js"
import { signIn,
        signUp,
        adminSignUp,
        deactivateAdmin,
        reactivateAdmin,
        superAdminSignUp,
        forgotPassword,
        resetPassword
    } from "../controllers/authControllers.js";



const router = Router();

router.post("/sign-in", signIn)
router.post("/sign-up", signUp)
router.post("/admin-sign-up", adminSignUp)
router.post("/super-admin-sign-up", superAdminSignUp)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.post("/deactivate-admin", deactivateAdmin)
router.post("/reactivate-admin", reactivateAdmin)
router.get("/google",  passport.authenticate('google', { scope:
    [ 'email', 'profile' ] }
));

router.get( '/google/sign-in',
    passport.authenticate( 'google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
}));



export default router;


   
  
 
 