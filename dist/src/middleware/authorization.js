import { User, UserRole } from "../users/model/userModel.js";
import mongoose from "mongoose";
import { Design } from "../design/model/designModel.js";
import { Order } from "../order/model/orderModel.js";
export const checkDesignOwnership = async (req, res, next) => {
    try {
        const loggedInUser = req.user;
        const { designId } = req.params;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(403).json({
                message: "Unauthorized: You do not have permission to modify this design",
            });
        }
        if (loggedInUser.role === UserRole.SuperAdmin) {
            return next();
        }
        const design = await Design.findById(designId);
        if (!design) {
            return res.status(404).json({ message: "Design not found" });
        }
        const order = await Order.findById(design.orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        const loggedId = new mongoose.Types.ObjectId(loggedInUser._id);
        const orderUserId = new mongoose.Types.ObjectId(order.userId.toString());
        if (!loggedId.equals(orderUserId)) {
            return res.status(403).json({
                message: "Unauthorized: You do not own this design",
            });
        }
        req.design = design;
        req.order = order;
        next();
    }
    catch (err) {
        console.error("Design ownership check error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
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
        if (loggedInUser.role === UserRole.SuperAdmin) {
            return next();
        }
        const loggedId = new mongoose.Types.ObjectId(loggedInUser._id);
        const id = Array.isArray(targetUserId) ? targetUserId[0] : targetUserId;
        const targetId = new mongoose.Types.ObjectId(id);
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
export const errorHandler = (err, req, res) => {
    console.error(err);
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ error: message });
};
//# sourceMappingURL=authorization.js.map