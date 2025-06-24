import { checkRole, checkSuperAdmin } from "../middleware/authorization.js";
import { User} from "../models/userModel.js"; 
import { Profile } from "../models/profileModel.js";
import PasswordResetToken from "../models/passwordResetToken.js"; 
import { hashPassword, generateToken, comparePassword, verifyToken, authenticateToken } from "../utils/auth.js";
import emails from "../utils/email.js";
import crypto from "crypto";

const token = crypto.randomBytes(32).toString("hex");

export const signUp = async (req, res) => {
    try {
        const { firstName, lastName, userName, email, password, phoneNumber } = req.body;
        if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        const existingProfile = await Profile.findOne({ where: { email } });
        if (existingProfile) {
            return res.status(400).json({ message: "Email already exists" });
        }
        const existingUserName = await Profile.findOne({ where: { userName } });
        if (existingUserName) {
            return res.status(400).json({ message: "Username already exists" });
        }
        if (password.length < 5) {
            return res.status(400).json({ message: "Password must be at least 5 characters" });
        }
        if(phoneNumber.length < 11){
            return res.status(400).json({ message: "Phone number is incomplete" });
        }
        const hashedPassword = await hashPassword(password);

        const newUser = await User.create({ role: "customer" });

        const newProfile = await Profile.create({
        user_id: newUser.user_id,
            firstName,
            lastName,
            userName,
            email,
            password: hashedPassword,
            phoneNumber,
        });

        try {
            await emails(
                email,
                "Welcome to AMPLE PRINTHUB",
                "Welcome to AMPLE PRINTHUB",
                userName,
                "Welcome to AMPLE PRINTHUB! We are excited to have you on board. You can sign in and continue shopping with us.",
                "https://ampleprinthub.com"
            );
        }catch (emailError) {
            console.error(`Email failed: ${emailError}`);
        }
        console.log("new sign up created")
        return res.status(201).json({ message: "User registered successfully", user: newProfile });
    }catch(error) {
        return res.status(500).json({ message: `Error registering user: ${error.message}` });
    }
};


export const adminSignUp = [
    authenticateToken,
    checkSuperAdmin,
    async (req, res) => {
        try {
            const { email, password, phoneNumber, firstName, lastName, userName } = req.body;

            if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
                return res.status(400).json({ message: "All fields are required" });
            }

            // Only allow role: admin
            const role = "admin";

            // Check if email or username exists
            const existingProfile = await Profile.findOne({ where: { email } });
            if (existingProfile) {
                return res.status(400).json({ message: "Email already exists" });
            }
            const existingUserName = await Profile.findOne({ where: { userName } });
            if (existingUserName) {
                return res.status(400).json({ message: "Username already exists" });
            }

            // Validate password strength
            if (password.length < 5) {
                return res.status(400).json({ message: "Password must be at least 5 characters" });
            }

            // Hash password
            const hashedPassword = await hashPassword(password);

            // Create user
            const newUser = await User.create({ role });

            // Create profile
            const newProfile = await Profile.create({
                user_id: newUser.user_id,
                firstName,
                lastName,
                userName,
                email,
                password: hashedPassword,
                phoneNumber,
            });

            const superAdminEmail = req.user.email;
            const superAdminUserName = req.user.userName;

             try{
                await emails(
                    superAdminEmail,
                    "New Admin Created in AMPLE PRINTHUB",
                    "New Admin Created in AMPLE PRINTHUB",
                    superAdminUserName,
                    `A new admin has been created in AMPLE PRINTHUB. Admin details:\n\nEmail: ${email}\nUsername: ${userName}\n\nYou can now manage this admin from your dashboard.`,
                    "https://ampleprinthub.com"
                )
                }catch(error){
                    return res.status(500).json({ message: "Error sending email to super admin" });
                }
            
            try{
                await emails(
                    email,
                    "Welcome Admin to AMPLE PRINTHUB",
                    "Welcome Admin to AMPLE PRINTHUB",
                    userName,
                    `Welcome to the AMPLE PRINTHUB! You have been added as an admin. You can sign in with this email ${email} and this password ${password}. we are glad to have you in the team.`,
                    "https://ampleprinthub.com"
                )
        }catch(error){
            console.error(`Email failed: ${error}`);
            return res.status(500).json({ message: "Error sending email" });
        }

        return res.status(201).json({
            message: "Admin created successfully",
            user: {
            user_id: newUser.user_id,
            email: newProfile.email,
            role: newUser.role,
            }
        });
        } catch (error) {
        return res.status(500).json({ message: `Error creating admin: ${error.message}` });
        }
  },
];

export const superAdminSignUp = [
        async (req, res) => {
            try {
                const { email, password, phoneNumber, firstName, lastName, userName } = req.body;

                if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
                    return res.status(400).json({ message: "All fields are required" });
                }
                const role = "superadmin";

                const existingProfile = await Profile.findOne({ where: { email } });
                if (existingProfile) {
                    return res.status(400).json({ message: "Email already exists" });
                }
                const existingUserName = await Profile.findOne({ where: { userName } });
                if (existingUserName) {
                    return res.status(400).json({ message: "Username already exists" });
                }

                if (password.length < 5) {
                    return res.status(400).json({ message: "Password must be at least 5 characters" });
                }
                const hashedPassword = await hashPassword(password);

                const newUser = await User.create({ role });

                const newProfile = await Profile.create({
                    user_id: newUser.user_id,
                    firstName,
                    lastName,
                    userName,
                    email,
                    password: hashedPassword,
                    phoneNumber,
                });

                try{
                    await emails(
                        email,
                        "Welcome Superadmin to AMPLE PRINTHUB",
                        "Welcome Superadmin to AMPLE PRINTHUB",
                        userName,
                        `Welcome to the AMPLE PRINTHUB! You have been added as a superadmin. You can sign in with this email ${email} and this password ${password}. we are glad to have you in the team.`,
                        "https://ampleprinthub.com"
                    )
                }catch(error){
                    console.error(`Email failed: ${error}`);
                    return res.status(500).json({ message: "Error sending email" });
                }


                return res.status(201).json({
                    message: "Superadmin created successfully",
                    user: {
                        user_id: newUser.user_id,
                        email: newProfile.email,
                        role: newUser.role,
                    }
                });
            } catch (error) {
                return res.status(500).json({ message: `Error creating superadmin: ${error.message}` });
            }
        },
]

export const signIn = [
    async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required" });
            }
            const profile = await Profile.findOne({ where: { email } });
            if (!profile) {
                return res.status(404).json({ message: "User not found" });
            }
            const user = await User.findOne({ where: { user_id: profile.user_id } });
            if (!user || !user.isActive) {
                return res.status(403).json({ message: "Account is inactive or not found" });
            }
            const isPasswordValid = await comparePassword(password, profile.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: "Invalid password" });
            }
            const accessToken = generateToken({ user_id: user.user_id, email: profile.email, role: user.role });
            return res.status(200).json({
                message: "Sign in successful",
                accessToken,
                id : user.user_id,
                role: user.role,
                email : profile.email
            });
        } catch (error) {
            return res.status(500).json({ message: `Error during sign in: ${error.message}` });
        }
    },
];

// Deactivate admin (superadmin only, protects ampleprinthub@gmail.com)
export const deactivateAdmin = [
    authenticateToken,
    checkSuperAdmin,
    async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: "Email is required" });
            }
            const superAdminEmail = req.user.email;
            if (email === superAdminEmail) {
                return res.status(403).json({ message: "Cannot deactivate the permanent superadmin" });
            }
            const profile = await Profile.findOne({ where: { email } });
            if (!profile) {
                return res.status(404).json({ message: "Admin not found" });
            }
            const user = await User.findOne({ where: { user_id: profile.user_id } });
            if (!user || user.role === "customer") {
                return res.status(400).json({ message: "User is not an admin" });
            }
            if (user.user_id === req.user.user_id) {
                return res.status(400).json({ message: "Cannot deactivate yourself" });
            }
            if (user.isActive === false) {
                return res.status(400).json({ message: "User is already deactivated" });
            }
            user.isActive = false;
            await user.save();

             
            const superAdminUserName = req.user.userName;

             try{
                await emails(
                    superAdminEmail,
                    "Admin Deactivated Successfully",
                    "Admin Deactivated Successfully",
                    superAdminUserName,
                    `Admin ${userName} with email : ${email} has been deactivated in AMPLE PRINTHUB. \n\nYou can now manage this admin from your dashboard.`,
                    "https://ampleprinthub.com"
                )
                }catch(error){
                    return res.status(500).json({ message: "Error sending deactivation email to super admin" });
                }

            try{
                await emails(
                    email,
                    "Account Deactivation Successful",
                    "Account Deactivation Successful",
                    profile.userName,
                    `Your AMPLE PRINTHUB account has been deactivated by superadmin ${req.user.email}. If you believe this is a mistake, please contact support.`,
                    "https://ampleprinthub.com"
                );
            }catch(error){  
                console.error(`Email failed: ${error}`);
                return res.status(500).json({ message: "Error sending email" });
            }

            console.log(`Admin ${email} deactivated by superadmin ${req.user.user_id}`);

            return res.status(200).json({ message: `Admin ${email} deactivated successfully` });
        }catch(error) {
            return res.status(500).json({ message: `Error deactivating admin: ${error.message}` });
        }
    },
];

export const reactivateAdmin = [
    authenticateToken,
    checkSuperAdmin,  
    async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: "Email is required" });
            }

            const profile = await Profile.findOne({ where: { email } });
            if (!profile) {
                return res.status(404).json({ message: "Admin not found" });    
            }
            const user = await User.findOne({ where: { user_id: profile.user_id } });
            if (!user) {
                return res.status(404).json({ message: "User not found" }); 
            }
            if (user.role === "customer") {
                return res.status(400).json({ message: "User is not an admin" });           
            }
            if(user.isActive === true){
                return res.status(400).json({ message: "User is already active" });
            }
            // Reactivate user
            user.isActive = true;
            await user.save();

             const superAdminEmail = req.user.email;
            const superAdminUserName = req.user.userName;

             try{
                await emails(
                    superAdminEmail,
                    "Admin Reactivation Successful",
                    "Admin Reactivation Successful",
                    superAdminUserName,
                    `Admin ${userName} with email : ${email} has been reactivated in AMPLE PRINTHUB. \n\nYou can now manage this admin from your dashboard.`,
                    "https://ampleprinthub.com"
                )
                }catch(error){
                    return res.status(500).json({ message: "Error sending reactivation email to super admin" });
                }

            try{
                await emails(
                    email,
                    "Account Reactivation",
                    "Account Reactivation",
                    profile.userName,
                    `Your AMPLE PRINTHUB account has been reactivated by superadmin ${req.user.email}. You can now log in again.`,
                    "https://ampleprinthub.com"
                );
            }
            catch(error){
                console.error(`Email failed: ${error}`);
                return res.status(500).json({ message: "Error sending email" });
            }   
            return res.status(200).json({ message: `Admin ${email} reactivated successfully` });
        }catch (error) {
            return res.status(500).json({ message: `Error reactivating admin: ${error.message}` });
        }
    }             
]

// Forgot password (all users)
export const forgotPassword = async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
            return res.status(400).json({ message: "Email is required" });
            }
            const profile = await Profile.findOne({ where: { email } });
            if (!profile) {
            return res.status(404).json({ message: "User not found" });
            }
            const user = await User.findOne({ where: { user_id: profile.user_id } });
            if (!user || !user.isActive) {
            return res.status(403).json({ message: "Account is inactive or not found" });
            }
            
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
            const hours = expiresAt.getHours().toString().padStart(2, '0');
            const minutes = expiresAt.getMinutes().toString().padStart(2, '0');
            const seconds = expiresAt.getSeconds().toString().padStart(2, '0');

            const timeString = `${hours}:${minutes}:${seconds}`;

            await PasswordResetToken.destroy({ where: { user_id: user.user_id } });

            await PasswordResetToken.create({
            user_id: user.user_id,
            token,
            expiresAt,
            });

            const resetUrl = `http://localhost:3001/reset-password?token=${token}`; // Replace with frontend URL
            try {
                await emails(
                    email,
                    "Password Reset Request",
                    "Password Reset Request",
                    profile.userName,
                    `Hello ${profile.userName},\n\nYou requested a password reset for your AMPLE PRINTHUB ACCOUNT. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour at ${timeString}. If you did not request this, ignore this email.\n\nBest,\nAmple PrintHub`
                );
            } catch (emailError) {
                console.error(`Email failed: ${emailError}`);
                return res.status(500).json({ message: "Error sending reset email" });
            }

            return res.status(200).json({ message: "Password reset email sent" });
        } catch (error) {
            return res.status(500).json({ message: `Error processing forgot password: ${error.message}` });
        }
};

// Reset password (all users)
export const resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        if (!password ) {
        return res.status(400).json({ message: "A new password is required" });
        }

        if (!confirmPassword) {
        return res.status(400).json({ message: "Kindly confirm your password is required" });
        }
        if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
        }
        // const token = req.query.token;
        if (!token) {           
        return res.status(400).json({ message: "Token is required" });
        }
        console.log("Reset password token:", token);
        const newPassword = password;
        if (newPassword.length < 5) {
        return res.status(400).json({ message: "New password must be at least 5 characters" });
        }
        const resetToken = await PasswordResetToken.findOne({ where: { token } });
        if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
        }
        if (resetToken.expiresAt < new Date()) {
        await resetToken.destroy();
        return res.status(400).json({ message: "Token has expired" });
        }
        const user = await User.findOne({ where: { user_id: resetToken.user_id } });
        if (!user || !user.isActive) {
        return res.status(403).json({ message: "Account is inactive or not found" });
        }
        const profile = await Profile.findOne({ where: { user_id: user.user_id } });
        if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
        }

        const hashedPassword = await hashPassword(password);
        if (!hashedPassword) {
            return res.status(500).json({ message: "Error hashing password" });
        }
        profile.password = hashedPassword;
        await profile.save();

        await resetToken.destroy();

        try {
            await emails(
                profile.email,
                "Password Reset Successful",
                `Hello ${profile.userName},\n\nYour AMPLE PRINTHUB ACCOUNT password has been successfully reset. If you did not perform this action, contact support immediately.\n\nBest,\nAmple PrintHub`
            );
        } catch (emailError) {
            console.error(`Email failed: ${emailError}`);
        }

        return res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        return res.status(500).json({ message: `Error resetting password: ${error.message}` });
    }
};

