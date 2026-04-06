import passport from "passport";
import dotenv from "dotenv";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { Strategy as JwtStrategy, ExtractJwt, } from "passport-jwt";
import { User, UserRole } from "../users/model/userModel.js";
import { Profile } from "../users/model/profileModel.js";
dotenv.config();
/* =========================
   ENV CHECK
========================= */
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    throw new Error("Google OAuth CLIENT_ID and CLIENT_SECRET must be defined in environment variables");
}
if (!process.env.JWT_SECRET_KEY) {
    throw new Error("JWT_SECRET_KEY is missing in environment variables");
}
/* =========================
   GOOGLE STRATEGY
========================= */
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4001/api/v1/auth/google/callback",
    passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new Error("Google account has no email"), null);
        }
        // 🔍 Find user by googleId OR email
        let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email }],
        });
        // 🆕 Create user if not exists
        if (!user) {
            user = await User.create({
                email,
                role: UserRole.Customer,
                isActive: true,
                googleId: profile.id,
            });
            await Profile.create({
                userId: user._id,
                firstName: profile.name?.givenName || "",
                lastName: profile.name?.familyName || "",
                userName: "",
                phoneNumber: "",
            });
        }
        // 🔗 Link Google account if user exists but has no googleId
        else if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
        }
        return done(null, user);
    }
    catch (error) {
        console.error("Google OAuth error:", error);
        return done(error, null);
    }
}));
/* =========================
   SESSION SERIALIZATION
========================= */
passport.serializeUser((user, done) => {
    done(null, user._id);
});
passport.deserializeUser(async (_id, done) => {
    try {
        const user = await User.findById(_id).exec();
        done(null, user ?? null);
    }
    catch (err) {
        done(err, null);
    }
});
/* =========================
   JWT STRATEGY
========================= */
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET_KEY,
};
passport.use(new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
    try {
        const profile = await Profile.findOne({ userId: jwt_payload.userId });
        if (!profile)
            return done(null, false);
        const user = await User.findById(profile.userId);
        if (!user || !user.isActive)
            return done(null, false);
        return done(null, {
            userId: user._id,
            email: user.email,
            role: user.role,
        });
    }
    catch (err) {
        console.error("JWT Strategy error:", err);
        return done(err, false);
    }
}));
export default passport;
//# sourceMappingURL=passport.js.map