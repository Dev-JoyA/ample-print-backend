import {Request, Response, NextFunction} from "express";
import { User, UserRole} from "../models/userModel.js";


export const checkRole = (roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized", message: `You do not have permission to access this resource only ${roles} have access` });
    }
  }catch(error){
    console.error("Error checking user role:", error);
    return res.status(500).json({ error: "Internal Server Error", message: "An error occurred while checking user role" });
  }
  next();
};

export const checkSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
   try{
      if (!req.user || req.user.role !== UserRole.SuperAdmin) {
        return res.status(403).json({ message: "Unauthorized: Superadmin access required" });
      }
      const user = await User.findOne({ userId: req.user.userId, isActive: true });
      if (!user) {
        return res.status(403).json({ message: "Unauthorized: Inactive superadmin account" });
      }
   }catch(error){
      console.error("Error checking super admin role:", error);
      return res.status(500).json({ error: "Internal Server Error", message: "An error occurred while checking super admin role" });
   }
    next();
  };

  export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err); 
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
};

