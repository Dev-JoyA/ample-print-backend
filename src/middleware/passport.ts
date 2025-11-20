// src/config/passport.ts
import passport from "passport";
import dotenv from "dotenv";
import { Strategy as GoogleStrategy  } from "passport-google-oauth2";
import { User, IUser, UserRole } from "../models/userModel.js";

dotenv.config();

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error("Google OAuth CLIENT_ID and CLIENT_SECRET must be defined in environment variables");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:4001/auth/google/signIn",
      passReqToCallback: true,
    },
    async (request: Express.Request, accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile._id }).exec();
        if (!user) {
          // Create new user if not exists
          user = await User.create({
            email: profile.email,
            password: "", // OAuth user
            role: UserRole.Customer,
            isActive: true,
            googleId: profile._id,
          } as Partial<IUser>);
        }
        return done(null, user);
      } catch (error) {
        console.error("Google OAuth error:", error);
        return done(error as Error, null);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize the user by ID from the session
passport.deserializeUser(async (_id: string, done) => {
  try {
    const user = await User.findById(_id).exec();
    done(null, user);
  } catch (err) {
    done(err as Error, null);
  }
});

export default passport;
