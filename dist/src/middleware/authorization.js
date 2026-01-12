import { User, UserRole } from "../users/model/userModel.js";
import mongoose from "mongoose";
export const checkRole = (roles) => async (req, res, next) => {
    try {
        const userRole = req.user?.role;
        if (!req.user || !userRole || !roles.includes(userRole)) {
            return res.status(403).json({
                error: "Unauthorized",
                message: `You do not have permission to access this resource. Only [${roles.join(", ")}] have access`,
            });
        }
        next();
    }
    catch (error) {
        console.error("Error checking user role:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while checking user role",
        });
    }
};
export const checkSuperAdmin = async (req, res, next) => {
    try {
        const currentUser = req.user;
        if (!currentUser || currentUser.role !== UserRole.SuperAdmin) {
            return res
                .status(403)
                .json({ message: "Unauthorized: Superadmin access required" });
        }
        const user = await User.findOne({
            _id: currentUser._id,
            isActive: true,
        }).exec();
        if (!user) {
            return res
                .status(403)
                .json({ message: "Unauthorized: Inactive superadmin account" });
        }
        next();
    }
    catch (error) {
        console.error("Error checking super admin role:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while checking super admin role",
        });
    }
};
export const checkAdmin = async (req, res, next) => {
    try {
        const currentUser = req.user;
        if (!currentUser ||
            (currentUser.role !== UserRole.Admin &&
                currentUser.role !== UserRole.SuperAdmin)) {
            return res
                .status(403)
                .json({ message: "Unauthorized: Admin or Superadmin access required" });
        }
        const user = await User.findOne({
            _id: currentUser._id,
            isActive: true,
        }).exec();
        if (!user) {
            return res
                .status(403)
                .json({ message: "Unauthorized: Inactive admin account" });
        }
        next();
    }
    catch (error) {
        console.error("Error checking admin role:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while checking admin role",
        });
    }
};
export const checkOwnership = (req, res, next) => {
    try {
        const loggedInUser = req.user;
        const targetUserId = req.params.userId;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(403).json({
                message: "Unauthorized: You do not have permission to modify this account",
            });
        }
        // SuperAdmin bypass
        if (loggedInUser.role === UserRole.SuperAdmin) {
            return next();
        }
        // create an ObjectId instance with `new` before calling equals
        const loggedId = new mongoose.Types.ObjectId(loggedInUser._id);
        const targetId = new mongoose.Types.ObjectId(targetUserId);
        if (!loggedId.equals(targetId)) {
            return res.status(403).json({
                message: "Unauthorized: You do not have permission to modify this account",
            });
        }
        next();
    }
    catch (err) {
        console.error("Ownership check error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
export const errorHandler = (err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ error: message });
};
//# sourceMappingURL=authorization.js.map