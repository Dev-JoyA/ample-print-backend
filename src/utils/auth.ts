import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";

dotenv.config();

const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET_KEY as string; 

export const hashPassword = async (password: string) => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(password, salt);
  } catch (error: any) {
    console.error("Error hashing password:", error);
    throw new Error(`Error hashing password: ${error.message}`);
  }
};

export const comparePassword = async (password: string, hashedPassword: string) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error: any) {
    console.error("Error comparing password:", error.message);
    throw new Error(`Error comparing password: ${error.message}`);
  }
};

export const generateToken = (payload: any) => {
  try {
    return jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
  } catch (error: any) {
    console.error("Error generating token:", error.message);
    throw new Error(`Error generating token: ${error.message}`);
  }
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error: any) {
    console.error("Error verifying token:", error.message);
    throw new Error(`Error verifying token: ${error.message}`);
  }
};
export const generateRefreshToken = (payload: any) => {
  try {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, { expiresIn: "7d" });
  } catch (error: any) {
    console.error("Error generating refresh token:", error.message);
    throw new Error(`Error generating refresh token: ${error.message}`);
  }
};
export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string);
  } catch (error: any) {
    console.error("Error verifying refresh token:", error.message);
    throw new Error(`Error verifying refresh token: ${error.message}`);
  }
};
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  console.log('Authorization header:', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET_KEY as string, (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err);
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
      }
      console.log('Decoded token payload:', decoded);
      req.user = decoded as { userId: string; role: string; userName: string; email: string };
      next();
    });
};