import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import { Profile } from "../models/profileModel.js";
import { User } from "../models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.JWT_SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY is missing in environment variables");
}

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET_KEY,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload: any, done: any) => {
    try {
      // jwt_payload contains userId, email, userName, role
      const profile = await Profile.findOne({ userId: jwt_payload.userId });

      if (!profile) {
        console.log("Profile not found for userId:", jwt_payload.userId);
        return done(null, false);
      }

      const user = await User.findById(profile.userId);

      if (!user || !user.isActive) {
        console.log("User not found or inactive:", profile.userId);
        return done(null, false);
      }

      return done(null, {
        userId: user._id,
        email: user.email,
        role: user.role
      });

    } catch (error) {
      console.error("JWT Strategy error:", error);
      return done(error, false);
    }
  })
);

export default passport;
