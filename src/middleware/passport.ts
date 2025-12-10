// src/config/passport.ts
import passport from "passport";
import dotenv from "dotenv";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { User, IUser, UserRole } from "../models/userModel.js";
import { Profile } from "../models/profileModel.js";

dotenv.config();

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error(
    "Google OAuth CLIENT_ID and CLIENT_SECRET must be defined in environment variables",
  );
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:4001/api/v1/auth/google/callback",
      passReqToCallback: true,
    },
    async (
      request: Express.Request,
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: any) => void,
    ) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id }).exec();
        if (!user) {
          // Create new user if not exists
          user = await User.create({
            email: profile.emails[0].value,
            password: "", // OAuth user
            role: UserRole.Customer,
            isActive: true,
            googleId: profile.id,
          } as Partial<IUser>);

          await Profile.create({
            userId: user._id,
            firstName: profile.name?.givenName || "",
            lastName: profile.name?.familyName || "",
            userName: "",
            phoneNumber: "",
          });
        }
        return done(null, user);
      } catch (error) {
        console.error("Google OAuth error:", error);
        return done(error as Error, null);
      }
    },
  ),
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
