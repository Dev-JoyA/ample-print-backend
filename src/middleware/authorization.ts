import { Request, Response, NextFunction } from "express";
import { User, UserRole } from "../models/userModel.js";


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
    const currentUser = req.user as unknown as { role?: UserRole; _id?: string };
    if (!currentUser || currentUser.role !== UserRole.SuperAdmin) {
      return res.status(403).json({ message: "Unauthorized: Superadmin access required" });
    }

    // Verify active superadmin account in DB
    const user = await User.findOne({ _id: currentUser._id, isActive: true }).exec();
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

export const checkAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = req.user as unknown as { role?: UserRole; _id?: string };
    if (!currentUser || (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.SuperAdmin)) {
      return res.status(403).json({ message: "Unauthorized: Admin or Superadmin access required" });
    }

    // Verify active admin account in DB
    const user = await User.findOne({ _id: currentUser._id, isActive: true }).exec();
    if (!user) {
      return res.status(403).json({ message: "Unauthorized: Inactive admin account" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while checking admin role"
    });
  }
};

// Check if the logged-in user owns the resource they want to modify
export const checkOwnership = (req: Request, res: Response, next: NextFunction) => {
  try {
    const loggedInUser = req.user as { _id: string; role: string };

    if (!loggedInUser) {
      return res.status(401).json({ message: "Unauthorized: No user found in token" });
    }

    const targetUserId = req.params.userId; // or req.body.userId depending on your route

    // SuperAdmin bypasses ownership (optional)
    if (loggedInUser.role === UserRole.SuperAdmin) {
      return next();
    }

    // Check if the logged in user is trying to modify their own account
    if (loggedInUser._id !== targetUserId) {
      return res.status(403).json({
        message: "Unauthorized: You do not have permission to modify this account"
      });
    }

    next();
  } catch (err) {
    console.error("Ownership check error:", err);
    return res.status(500).json({ message: "Internal server error" });
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
