// seeders/seedSuperAdmin.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, UserRole } from "../users/model/userModel.js";
import { Profile } from "../users/model/profileModel.js";
import { hashPassword } from "../utils/auth.js";

dotenv.config();

const DB_URL = process.env.MONGO_URI ?? "mongodb://localhost:27017/ample_printhub";

async function seedSuperAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(DB_URL);
    console.log("Connected successfully");

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ role: UserRole.SuperAdmin });
    if (existingSuperAdmin) {
      console.log("SuperAdmin already exists. Clearing existing data...");
      await User.deleteMany({ role: UserRole.SuperAdmin });
      await Profile.deleteMany({ userId: existingSuperAdmin._id });
    }

    const hashedPassword = await hashPassword("StrongPassword123");

    const superAdminUser = await User.create({
      email: "joy.gold13@gmail.com",
      password: hashedPassword,
      role: UserRole.SuperAdmin,
      isActive: true,
    });

    const superAdminProfile = await Profile.create({
      userId: superAdminUser._id,
      firstName: "Super",
      lastName: "Admin",
      userName: "superadmin",
      phoneNumber: "08000000000",
      address: "Lagos, Nigeria",
    });

    console.log("✅ SuperAdmin created successfully:");
    console.log("   Email:", superAdminUser.email);
    console.log("   Password: StrongPassword123");
    console.log("   Profile:", superAdminProfile.firstName, superAdminProfile.lastName);
    
  } catch (err) {
    console.error("❌ Error seeding superadmin:", err);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

seedSuperAdmin();