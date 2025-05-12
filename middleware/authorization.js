import express from "express";
import { User} from "../models/userModel.js";
import { Profile } from "../models/profileModel.js";

export const checkRole = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    next();
  };

export const checkSuperAdmin = async (req, res, next) => {
    if (!req.user || req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Unauthorized: Superadmin access required" });
    }
    const profile = await Profile.findOne({ where: { user_id: req.user.user_id } });
    if (!profile || !profile.email) {
      return res.status(403).json({ message: "Unauthorized: Invalid superadmin account" });
    }
    next();
  };

