import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const uri = process.env.MONGODB_URI as string;

export const startServer = async () => {
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");
};
