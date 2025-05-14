import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Profile } from "../models/profileModel.js"; 
import { User } from "../models/userModel.js"; 
import dotenv from "dotenv";

dotenv.config();

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
  secretOrKey: process.env.JWT_SECRET_KEY, 
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      console.log("JWT Payload:", jwt_payload); 
      const profile = await Profile.findOne({ where: { email: jwt_payload.email } });
      if (!profile) {
        console.log("Profile not found for email:", jwt_payload.email);
        return done(null, false);
      }

      const user = await User.findOne({ where: { user_id: profile.user_id } });
      if (!user || !user.isActive) {
        console.log("User not found or inactive for user_id:", profile.user_id);
        return done(null, false);
      }

      return done(null, { user_id: user.user_id, email: profile.email, role: user.role });
    } catch (error) {
      console.error("JWT Strategy error:", error);
      return done(error, false);
    }
  })
);

export default passport;