import express from "express";
import User from "../models/userModel.js"
import {hashPassword, generateToken, comparePassword, verifyToken} from "../utils/utils.js"

export const signIn = (async(req, res) => {
    
    try{
        //ensures user sign in with email and password
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({message : "Email and password is required"})
        }

        //check to see if user exist
        const user = await User.findOne({where : {email}})
        if(!user){
            return res.status(404).json({ message: "User not found" })
        }

        //validate user password
        const validatePassword = await comparePassword(password) 
        if(!validatePassword){
            return res.status(404).json({ message: "Invalid password" });
        }

        //Generate token
        const token = generateToken({id : user.id, email:user.email})
        return res.status(200).json({ message: "Sign in Successful", token });
    }catch(error){
        return  res.status(400).json({message : `Error during sign in ${error}`})
    } 
})

export const signUp = (async(req, res) => {
    
    try{
        //Check if all field are filled before sign up
        const {firstName, lastName, userName, email, password, phoneNumber} = req.body
        if(!firstName || !lastName || !userName || !email || !password || !phoneNumber ){
            return res.status(400).json({message : "All fields are required"})
        }
        //check if user already exist
        const exisitingUser = await User.findOne({where : {email}})
        if(exisitingUser){
            return res.status(200).json({message : "User already exist"})
        }

        const hashedPassword = await hashPassword(password)

        //create a new user
        const newUser = await User.create({firstName, lastName, userName, email, password : hashPassword, phoneNumber})
        return res.status(201).json({message : "User registered successfuly"})
    
    }catch(error){
        return  res.status(500).json({message : `Error registring User :  ${error}`})
    }
})