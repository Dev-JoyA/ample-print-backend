import { checkRole, checkSuperAdmin } from "../middleware/authorization.js";
import { User} from "../models/userModel.js"; 
import { Profile } from "../models/profileModel.js";
import PasswordResetToken from "../models/passwordResetToken.js"; 
import { hashPassword, generateToken, comparePassword, verifyToken } from "../utils/auth.js";
import emails from "../utils/email.js";
import passport from "../middleware/passport.js"
import crypto from "crypto";

// Sign in (all roles: customer, admin, superadmin)
export const signIn = [
  async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find profile by email
      const profile = await Profile.findOne({ where: { email } });
      if (!profile) {
        return res.status(404).json({ message: "User not found" });
      }

      // Find associated user
      const user = await User.findOne({ where: { user_id: profile.user_id } });
      if (!user || !user.isActive) {
        return res.status(403).json({ message: "Account is inactive or not found" });
      }

      // Validate password
      const isPasswordValid = await comparePassword(password, profile.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid password" });
      }

      // Generate token
      const accessToken = generateToken({ user_id: user.user_id, email: profile.email, role: user.role });
       

      return res.status(200).json({
        message: "Sign in successful",
        accessToken,
        role: user.role,
        email : profile.email
      });
    } catch (error) {
      return res.status(500).json({ message: `Error during sign in: ${error.message}` });
    }
  },
];

// Sign up (customers only)
export const signUp = async (req, res) => {
  try {
    const { firstName, lastName, userName, email, password, phoneNumber } = req.body;
    if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
      return res.status(400).json({ message: "All fields are required" });
    }

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

    // Create user (role: customer)
    const newUser = await User.create({ role: "customer" });

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

    // Send welcome email
    try {
      await emails(
        email,
        "Sign up successful",
        `Hello ${userName}, you have successfully signed up to AMPLE PRINTHUB ACCOUNT. Welcome aboard!`
      );
    } catch (emailError) {
      console.error(`Email failed: ${emailError}`);
    }

    return res.status(201).json({ message: "User registered successfully", user: newProfile });
  } catch (error) {
    return res.status(500).json({ message: `Error registering user: ${error.message}` });
  }
};

// Admin sign-up (superadmin creates admins only)
export const adminSignUp = [
  checkSuperAdmin,
  async (req, res) => {
    try {
      const { email, password, phoneNumber, firstName, lastName, userName } = req.body;

      // Validate required fields
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

      return res.status(201).json({
        message: "Admin created successfully",
        user: {
          user_id: newUser.user_id,
          email: newProfile.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: `Error creating admin: ${error.message}` });
    }
  },
];

export const superAdminSignUp = [
    checkSuperAdmin,
    async (req, res) => {
        try {
            const { email, password, phoneNumber, firstName, lastName, userName } = req.body;

            // Validate required fields
            if (!email || !password || !phoneNumber || !firstName || !lastName || !userName) {
                return res.status(400).json({ message: "All fields are required" });
            }

            // Only allow role: superadmin
            const role = "superadmin";

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

            return res.status(201).json({
                message: "Superadmin created successfully",
                user: {
                    user_id: newUser.user_id,
                    email: newProfile.email,
                    role: newUser.role,
                },
            });
        } catch (error) {
            return res.status(500).json({ message: `Error creating superadmin: ${error.message}` });
        }
    },
]

// Deactivate admin (superadmin only, protects ampleprinthub@gmail.com)
export const deactivateAdmin = [
  checkSuperAdmin,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Validate input
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Protect superadmin
      if (email === "ampleprinthub@gmail.com") {
        return res.status(403).json({ message: "Cannot deactivate the permanent superadmin" });
      }

      // Find profile
      const profile = await Profile.findOne({ where: { email } });
      if (!profile) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Find user
      const user = await User.findOne({ where: { user_id: profile.user_id } });
      if (!user || user.role === "customer") {
        return res.status(400).json({ message: "User is not an admin" });
      }

      // Prevent deactivating self (redundant with email check, but kept for safety)
      if (user.user_id === req.user.user_id) {
        return res.status(400).json({ message: "Cannot deactivate yourself" });
      }

      // Deactivate user
      user.isActive = false;
      await user.save();

      // Log action
      console.log(`Admin ${email} deactivated by superadmin ${req.user.user_id}`);

      return res.status(200).json({ message: `Admin ${email} deactivated successfully` });
    } catch (error) {
      return res.status(500).json({ message: `Error deactivating admin: ${error.message}` });
    }
  },
];

export const reactivateAdmin = [
    checkSuperAdmin,  
    async (req, res) => {
        try {
        const { email } = req.body;

        // Validate input
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
        // Reactivate user
        user.isActive = true;
        await user.save();

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

    // Find profile by email
    const profile = await Profile.findOne({ where: { email } });
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find associated user
    const user = await User.findOne({ where: { user_id: profile.user_id } });
    if (!user || !user.isActive) {
      return res.status(403).json({ message: "Account is inactive or not found" });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens
    await PasswordResetToken.destroy({ where: { user_id: user.user_id } });

    // Store token
    await PasswordResetToken.create({
      user_id: user.user_id,
      token,
      expiresAt,
    });

    // Send reset email
    const resetUrl = `http://your-app.com/reset?token=${token}`; // Replace with frontend URL
    try {
      await emails(
        email,
        "Password Reset Request",
        `Hello ${profile.userName},\n\nYou requested a password reset for your AMPLE PRINTHUB ACCOUNT. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.\n\nBest,\nAmple PrintHub`
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
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    // Validate password strength
    if (password.length < 5) {
      return res.status(400).json({ message: "New password must be at least 5 characters" });
    }

    // Find token
    const resetToken = await PasswordResetToken.findOne({ where: { token } });
    if (!resetToken) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Check expiration
    if (resetToken.expiresAt < new Date()) {
      await resetToken.destroy();
      return res.status(400).json({ message: "Token has expired" });
    }

    // Find user
    const user = await User.findOne({ where: { user_id: resetToken.user_id } });
    if (!user || !user.isActive) {
      return res.status(403).json({ message: "Account is inactive or not found" });
    }

    // Find profile
    const profile = await Profile.findOne({ where: { user_id: user.user_id } });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    profile.password = hashedPassword;
    await profile.save();

    // Invalidate token
    await resetToken.destroy();

    // Send confirmation email
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