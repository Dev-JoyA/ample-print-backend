import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("mongo db connected successfully")
    }catch(error){
        console.log(`Connection failed ${error}`)
    }
}

export default connectDB;