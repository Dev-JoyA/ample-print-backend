import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET_KEY; // Consistent with previous messages

export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error("Error hashing password:", error.message); // Log for debugging
    throw new Error(`Error hashing password: ${error.message}`);
  }
};

export const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error("Error comparing password:", error.message);
    throw new Error(`Error comparing password: ${error.message}`);
  }
};

export const generateToken = (payload) => {
  try {
    return jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
  } catch (error) {
    console.error("Error generating token:", error.message);
    throw new Error(`Error generating token: ${error.message}`);
  }
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    console.error("Error verifying token:", error.message);
    throw new Error(`Error verifying token: ${error.message}`);
  }
};