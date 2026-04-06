import { Types } from "mongoose";
import upload from "../../config/upload.js";
import * as customerBriefService from "../service/customerBriefService.js";
const getIO = (req) => {
    return req.io || req.app.get("io");
};
export const uploadBriefFiles = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "voiceNote", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "logo", maxCount: 1 },
]);
// POST /api/customer/orders/:orderId/products/:productId/brief
export const submitCustomerBrief = async (req, res) => {
    try {
        const user = req.user;
        const { orderId, productId } = req.params;
        const { description } = req.body;
        const io = getIO(req);
        const files = req.files;
        if (!orderId || !productId) {
            return res.status(400).json({
                success: false,
                message: "Order ID and Product ID are required in URL",
            });
        }
        const hasText = description && description.trim().length > 0;
        const hasFiles = files && Object.keys(files).length > 0;
        if (!hasText && !hasFiles) {
            return res.status(400).json({
                success: false,
                message: "At least one customization detail (text or file) is required",
            });
        }
        const briefData = {
            orderId: new Types.ObjectId(orderId),
            productId: new Types.ObjectId(productId),
            description: description || undefined,
        };
        if (files?.image)
            briefData.image = `/uploads/${files.image[0].filename}`;
        if (files?.voiceNote)
            briefData.voiceNote = `/uploads/${files.voiceNote[0].filename}`;
        if (files?.video)
            briefData.video = `/uploads/${files.video[0].filename}`;
        if (files?.logo)
            briefData.logo = `/uploads/${files.logo[0].filename}`;
        const brief = await customerBriefService.createOrUpdateCustomerBrief(briefData, user._id, user.role, io);
        res.status(201).json({
            success: true,
            message: "Brief submitted successfully",
            data: brief,
        });
    }
    catch (error) {
        console.error("Error submitting customer brief:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// POST /api/admin/orders/:orderId/products/:productId/respond
export const adminRespondToBrief = async (req, res) => {
    try {
        const user = req.user;
        const { orderId, productId } = req.params;
        const { description, designId } = req.body;
        const io = getIO(req);
        const files = req.files;
        if (!orderId || !productId) {
            return res.status(400).json({
                success: false,
                message: "Order ID and Product ID are required in URL",
            });
        }
        const briefData = {
            orderId: new Types.ObjectId(orderId),
            productId: new Types.ObjectId(productId),
            description: description || undefined,
            designId: designId ? new Types.ObjectId(designId) : undefined,
        };
        // Add file paths
        if (files?.image)
            briefData.image = `/uploads/${files.image[0].filename}`;
        if (files?.voiceNote)
            briefData.voiceNote = `/uploads/${files.voiceNote[0].filename}`;
        if (files?.video)
            briefData.video = `/uploads/${files.video[0].filename}`;
        if (files?.logo)
            briefData.logo = `/uploads/${files.logo[0].filename}`;
        const brief = await customerBriefService.createOrUpdateCustomerBrief(briefData, user._id, user.role, io);
        res.status(201).json({
            success: true,
            message: "Admin response submitted successfully",
            data: brief,
        });
    }
    catch (error) {
        console.error("Error submitting admin response:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// GET /api/briefs/orders/:orderId/products/:productId
export const getBriefByOrderAndProduct = async (req, res) => {
    try {
        const user = req.user;
        const { orderId, productId } = req.params;
        if (!orderId || !productId) {
            return res.status(400).json({
                success: false,
                message: "Order ID and Product ID are required",
            });
        }
        const briefs = await customerBriefService.getCustomerBriefByOrderId(orderId, user._id, user.role);
        res.status(200).json({
            success: true,
            data: briefs,
        });
    }
    catch (error) {
        console.error("Error fetching brief by order and product:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// GET /api/briefs/:briefId
export const getCustomerBriefById = async (req, res) => {
    try {
        const user = req.user;
        const { briefId } = req.params;
        if (!briefId) {
            return res.status(400).json({
                success: false,
                message: "Brief ID is required",
            });
        }
        const brief = await customerBriefService.getCustomerBriefById(briefId, user._id, user.role);
        if (!brief) {
            return res.status(404).json({
                success: false,
                message: "Brief not found",
            });
        }
        res.status(200).json({
            success: true,
            data: brief,
        });
    }
    catch (error) {
        console.error("Error fetching brief by ID:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// DELETE /api/briefs/:briefId
export const deleteCustomerBrief = async (req, res) => {
    try {
        const user = req.user;
        const { briefId } = req.params;
        const io = getIO(req);
        if (!briefId) {
            return res.status(400).json({
                success: false,
                message: "Brief ID is required",
            });
        }
        const result = await customerBriefService.deleteCustomerBrief(briefId, user._id, user.role, io);
        res.status(200).json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        console.error("Error deleting brief:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// GET /api/customer/briefs
export const getUserCustomerBriefs = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await customerBriefService.getUserCustomerBriefs(user._id, page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("Error fetching user briefs:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// GET /api/admin/briefs
export const getAdminCustomerBriefs = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const hasFiles = req.query.hasFiles === "true";
        const search = req.query.search;
        console.log("Admin briefs request:", { page, limit, status, hasFiles, search });
        const result = await customerBriefService.getAdminCustomerBriefs(user._id, {
            status: status,
            hasFiles,
            search,
            page,
            limit,
        });
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("Error fetching admin briefs:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// GET /api/briefs/status/:orderId/:productId
export const checkAdminResponseStatus = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const result = await customerBriefService.checkAdminResponseStatus(orderId, productId);
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("Error checking admin response status:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// PATCH /api/briefs/:briefId/view
export const markBriefAsViewed = async (req, res) => {
    try {
        const user = req.user;
        const { briefId } = req.params;
        const io = getIO(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const brief = await customerBriefService.markBriefAsViewed(briefId, user._id, user.role, io);
        res.status(200).json({
            success: true,
            message: "Brief marked as viewed",
            data: brief,
        });
    }
    catch (error) {
        console.error("Error marking brief as viewed:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// GET /api/briefs/order/:orderId/status
export const getOrderBriefStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const status = await customerBriefService.getOrderBriefStatus(orderId);
        res.status(200).json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        console.error("Error getting order brief status:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// Add this to your customerBriefController.js
// GET /api/briefs/order/:orderId/all
export const getAllBriefsByOrderId = async (req, res) => {
    try {
        const user = req.user;
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }
        const briefs = await customerBriefService.getAllBriefsByOrderId(orderId, user._id, user.role);
        res.status(200).json({
            success: true,
            data: briefs,
        });
    }
    catch (error) {
        console.error("Error fetching all briefs by order:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=customerBriefController.js.map