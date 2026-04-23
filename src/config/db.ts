import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const uri = process.env.MONGODB_URI as string;

// export const startServer = async () => {
//   await mongoose.connect(uri);
//   console.log("✅ Connected to MongoDB");
// };

export const startServer = async () => {
  try {
    await mongoose.connect(uri, {
      connectTimeoutMS: 20000,
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};
