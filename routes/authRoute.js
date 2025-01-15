import express, {Router} from "express";
// import passport from "passport";
import passport from "../middleware/passport.js"
import { signIn, signUp } from "../controllers/authControllers.js";

const router = Router();

router.post("/sign-in", signIn)
router.post("/sign-up", signUp)
router.get("/google",  passport.authenticate('google', { scope:
    [ 'email', 'profile' ] }
));

router.get( '/google/signI',
    passport.authenticate( 'google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
}));



export default router;


   
  
 
 