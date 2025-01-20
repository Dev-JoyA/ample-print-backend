import express, {Router} from "express";
import passport from "../middleware/passport.js"
import { signIn, signUp } from "../controllers/authControllers.js";
import { adminSignIn, adminSignUp , deleteAdmin} from "../controllers/adminAuthController.js"

const router = Router();

router.post("/sign-in", signIn)
router.post("/sign-up", signUp)
router.post("/admin/sign-in", adminSignIn)
router.post("/admin/sign-up", adminSignUp)
router.delete("/delete/admin", deleteAdmin)
router.get("/google",  passport.authenticate('google', { scope:
    [ 'email', 'profile' ] }
));

router.get( '/google/signI',
    passport.authenticate( 'google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
}));



export default router;


   
  
 
 