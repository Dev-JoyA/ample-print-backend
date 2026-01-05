import passport from "passport";
import dotenv from "dotenv";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import { User, IUser, UserRole } from "../users/model/userModel.js";
import { Profile } from "../users/model/profileModel.js";

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
      req: Express.Request,
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: any) => void
    ) => {
      try {
        let user = await User.findOne({ googleId: profile.id }).exec();
        if (!user) {
          user = await User.create({
            email: profile.emails[0].value,
            password: "", 
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
    }
  )
);

// Serialize / deserialize for sessions
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (_id: string, done) => {
  try {
    const user = await User.findById(_id).exec();
    done(null, user ?? null);
  } catch (err) {
    done(err as Error, null);
  }
});


if (!process.env.JWT_SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY is missing in environment variables");
}

const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET_KEY,
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwt_payload: any, done: any) => {
    try {
      const profile = await Profile.findOne({ userId: jwt_payload.userId });
      if (!profile) return done(null, false);

      const user = await User.findById(profile.userId);
      if (!user || !user.isActive) return done(null, false);

      return done(null, {
        userId: user._id,
        email: user.email,
        role: user.role,
      });
    } catch (err) {
      console.error("JWT Strategy error:", err);
      return done(err, false);
    }
  })
);

export default passport;
