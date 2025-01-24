import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const saltRounds = 10;
const jwt_key = process.env.JWT_SECRET_KEY;

export const hashPassword = (async(password) => {
    try{
        const salt = await bcrypt.genSalt(saltRounds)
        return await bcrypt.hash(password, salt);
    }catch(error){
        throw new Error (`Error hasing password ${error}`)
    }
})

export const comparePassword = async(password, hashPassword) => {
    try{
        return await bcrypt.compare(password, hashPassword);
    }catch(error){
        throw new Error (`Error comparing password ${error}`)
    }
}

export const generateToken = (payload) => {
    try{
        return jwt.sign(payload, jwt_key, {expiresIn : "1h"})
    }catch(error){
        throw new Error (`Error generating token ${error}`)
    }
}

export const verifyToken = (token) => {
    try{
        return jwt.verify(token, jwt_key);
    }catch(error){
        throw new Error (`Error veryfying token ${error}`)
    }
}