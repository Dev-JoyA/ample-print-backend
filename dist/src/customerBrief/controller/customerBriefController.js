import { Types } from "mongoose";
import upload from "../../config/upload.js";
import * as customerBriefService from "../service/customerBriefService.js";
const getIO = (req) => {
    return req.io || req.app.get("io");
};
const getStringParam = (param) => {
    return Array.isArray(param) ? param[0] : param;
};
export const uploadBriefFiles = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "voiceNote", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "logo", maxCount: 1 },
]);
export const submitCustomerBrief = async (req, res) => {
    try {
        const user = req.user;
        const orderId = getStringParam(req.params.orderId);
        const productId = getStringParam(req.params.productId);
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
        let finalDescription = description;
        if (!finalDescription || finalDescription.trim() === "") {
            finalDescription = "Custom order - please check product specifications";
        }
        const briefData = {
            orderId: new Types.ObjectId(orderId),
            productId: new Types.ObjectId(productId),
            description: finalDescription || undefined,
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
export const adminRespondToBrief = async (req, res) => {
    try {
        const user = req.user;
        const orderId = getStringParam(req.params.orderId);
        const productId = getStringParam(req.params.productId);
        const { description } = req.body;
        const designId = getStringParam(req.body.designId);
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
export const customerReplyToAdmin = async (req, res) => {
    try {
        const user = req.user;
        const orderId = getStringParam(req.params.orderId);
        const productId = getStringParam(req.params.productId);
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
                message: "At least one customization detail is required",
            });
        }
        let finalDescription = description;
        if (!finalDescription || finalDescription.trim() === "") {
            finalDescription = "Reply to admin";
        }
        const briefData = {
            orderId: new Types.ObjectId(orderId),
            productId: new Types.ObjectId(productId),
            description: finalDescription || undefined,
        };
        if (files?.image)
            briefData.image = `/uploads/${files.image[0].filename}`;
        if (files?.voiceNote)
            briefData.voiceNote = `/uploads/${files.voiceNote[0].filename}`;
        if (files?.video)
            briefData.video = `/uploads/${files.video[0].filename}`;
        if (files?.logo)
            briefData.logo = `/uploads/${files.logo[0].filename}`;
        const brief = await customerBriefService.customerReplyToAdmin(briefData, user._id, user.role, io);
        res.status(201).json({
            success: true,
            message: "Reply sent successfully",
            data: brief,
        });
    }
    catch (error) {
        console.error("Error submitting customer reply:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const markBriefAsComplete = async (req, res) => {
    try {
        const user = req.user;
        const briefId = getStringParam(req.params.briefId);
        const io = getIO(req);
        if (!briefId) {
            return res.status(400).json({
                success: false,
                message: "Brief ID is required",
            });
        }
        const brief = await customerBriefService.markBriefAsComplete(briefId, user._id, user.role, io);
        res.status(200).json({
            success: true,
            message: "Brief marked as complete",
            data: brief,
        });
    }
    catch (error) {
        console.error("Error marking brief as complete:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getBriefByOrderAndProduct = async (req, res) => {
    try {
        const user = req.user;
        const orderId = getStringParam(req.params.orderId);
        const productId = getStringParam(req.params.productId);
        if (!orderId || !productId) {
            return res.status(400).json({
                success: false,
                message: "Order ID and Product ID are required",
            });
        }
        const briefs = await customerBriefService.getCustomerBriefByOrderId(orderId, user._id, user.role);
        const filteredBriefs = briefs.filter((brief) => {
            const briefProductId = brief.productId?._id?.toString() ||
                brief.productId?.toString();
            return briefProductId === productId;
        });
        res.status(200).json({
            success: true,
            data: filteredBriefs,
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
export const getCustomerBriefById = async (req, res) => {
    try {
        const user = req.user;
        const briefId = getStringParam(req.params.briefId);
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
export const deleteCustomerBrief = async (req, res) => {
    try {
        const user = req.user;
        const briefId = getStringParam(req.params.briefId);
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
export const getAdminCustomerBriefs = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const hasFiles = req.query.hasFiles === "true";
        const search = req.query.search;
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
export const checkAdminResponseStatus = async (req, res) => {
    try {
        const orderId = getStringParam(req.params.orderId);
        const productId = getStringParam(req.params.productId);
        if (!orderId || !productId) {
            return res.status(400).json({
                success: false,
                message: "Order ID and Product ID are required",
            });
        }
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
export const markBriefAsViewed = async (req, res) => {
    try {
        const user = req.user;
        const briefId = getStringParam(req.params.briefId);
        const io = getIO(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!briefId) {
            return res.status(400).json({
                success: false,
                message: "Brief ID is required",
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
export const getOrderBriefStatus = async (req, res) => {
    try {
        const orderId = getStringParam(req.params.orderId);
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }
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
export const getAllBriefsByOrderId = async (req, res) => {
    try {
        const user = req.user;
        const orderId = getStringParam(req.params.orderId);
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
export const markBriefAsViewedByAdmin = async (req, res) => {
    try {
        const user = req.user;
        const briefId = getStringParam(req.params.briefId);
        if (!briefId) {
            return res.status(400).json({
                success: false,
                message: "Brief ID is required",
            });
        }
        const brief = await customerBriefService.markBriefAsViewedByAdmin(briefId, user._id, user.role);
        res.status(200).json({
            success: true,
            message: "Brief marked as viewed by admin",
            data: brief,
        });
    }
    catch (error) {
        console.error("Error marking brief as viewed by admin:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getCustomerPendingBriefResponses = async (req, res) => {
    try {
        const user = req.user;
        const pendingResponses = await customerBriefService.getCustomerPendingBriefResponses(user._id);
        res.status(200).json({
            success: true,
            data: pendingResponses,
        });
    }
    catch (error) {
        console.error("Error fetching pending brief responses:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=customerBriefController.js.map