import passport from "passport";
import dotenv from "dotenv"
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { User } from "../models/userModel.js"


dotenv.config();



passport.use(new GoogleStrategy({
    clientID : process.env.CLIENT_ID,
    clientSecret : process.env.CLIENT_SECRET,
    callbackUrl : "http://localhost:4001/auth/google/signIn",
    passReqToCallback : true
},

    async(request, accessToken, refreshToken, profile, done)=> {
        try {
            const user = await User.findOrCreate({googleId : profileId});
            return done(err, user)
        }catch(error){
           return done(err, null)
        }
    }
   
))

passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id); 
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

export default passport