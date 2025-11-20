import { Request, Response, NextFunction } from "express";
import { User, UserRole } from "../models/userModel.js";

// ----------------------
// Role-based access control
// ----------------------
export const checkRole = (roles: UserRole[]) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is typed via Express augmentation
    const userRole = (req.user as unknown as { role?: UserRole })?.role;
    if (!req.user || !userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        error: "Unauthorized",
        message: `You do not have permission to access this resource. Only [${roles.join(", ")}] have access`
      });
    }
    next();
  } catch (error) {
    console.error("Error checking user role:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while checking user role"
    });
  }
};

// ----------------------
// Superadmin-only access
// ----------------------
export const checkSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = req.user as unknown as { role?: UserRole; userId?: string };
    if (!currentUser || currentUser.role !== UserRole.SuperAdmin) {
      return res.status(403).json({ message: "Unauthorized: Superadmin access required" });
    }

    // Verify active superadmin account in DB
    const user = await User.findOne({ userId: currentUser.userId, isActive: true }).exec();
    if (!user) {
      return res.status(403).json({ message: "Unauthorized: Inactive superadmin account" });
    }

    next();
  } catch (error) {
    console.error("Error checking super admin role:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while checking super admin role"
    });
  }
};

// ----------------------
// Global error handler
// ----------------------
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err); 
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
};
