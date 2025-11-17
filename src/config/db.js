import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;

export const startServer = async () => {
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
};