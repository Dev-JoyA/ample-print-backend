import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();
const uri = process.env.MONGODB_URI;
export const startServer = async () => {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");
};
//# sourceMappingURL=db.js.map