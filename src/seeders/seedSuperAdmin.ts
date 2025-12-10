// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import { User, UserRole } from "./models/userModel.js";
// import { Profile } from "./models/profileModel.js";
// import { hashPassword } from "./utils/auth.js";

// dotenv.config();

// const DB_URL = process.env.MONGO_URI ?? "mongodb://localhost:27017/ample_printhub";

// async function seedSuperAdmin() {
//   try {
//     await mongoose.connect(DB_URL);

//     // Clear old data
//     await User.deleteMany({});
//     await Profile.deleteMany({});

//     const hashedPassword = await hashPassword("StrongPassword123");

//     const superAdminUser = await User.create({
//       email: "superadmin@ample.com",
//       password: hashedPassword,
//       role: UserRole.SuperAdmin,
//       isActive: true,
//     });

//     const superAdminProfile = await Profile.create({
//       userId: superAdminUser._id,
//       firstName: "Super",
//       lastName: "Admin",
//       userName: "superadmin",
//       phoneNumber: "08000000000",
//     });

//     console.log("SuperAdmin created:", superAdminUser.email);
//     mongoose.connection.close();
//   } catch (err) {
//     console.error(err);
//     mongoose.connection.close();
//   }
// }

// seedSuperAdmin();

// ts-node seedSuperAdmin.ts
