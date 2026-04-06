import * as feedbackService from "../service/feedbackService.js";
import { FeedBackStatus } from "../model/feedback.js";
const getIO = (req) => {
    return req.io || req.app.get("io");
};
// ==================== CREATE FEEDBACK ====================
export const createFeedback = async (req, res) => {
    try {
        const user = req.user;
        const io = getIO(req);
        const { orderId, designId, message } = req.body;
        const files = req.files;
        // Validate required fields
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }
        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Feedback message is required",
            });
        }
        // Process attachments if any
        const attachments = files?.map((file) => `/uploads/${file.filename}`) || [];
        const feedback = await feedbackService.createCustomerFeedback({
            orderId,
            designId,
            message,
            attachments,
        }, user._id, io);
        res.status(201).json({
            success: true,
            message: "Feedback submitted successfully",
            data: feedback,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const respondToFeedback = async (req, res) => {
    try {
        const user = req.user;
        const io = getIO(req);
        const { feedbackId } = req.params;
        let response;
        let attachments = [];
        if (req.is('multipart/form-data')) {
            response = req.body.response;
            const files = req.files;
            if (files && files.length > 0) {
                attachments = files.map(file => `/uploads/${file.filename}`);
            }
        }
        else {
            response = req.body.response;
        }
        if (!response || response.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Response message is required",
            });
        }
        // Now passing 5 arguments correctly
        const feedback = await feedbackService.adminRespondToFeedback(feedbackId, response, attachments, user._id, io);
        res.status(200).json({
            success: true,
            message: "Response submitted successfully",
            data: feedback,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== UPDATE FEEDBACK STATUS ====================
export const updateStatus = async (req, res) => {
    try {
        const user = req.user;
        const io = getIO(req);
        const { feedbackId } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }
        // Validate status enum
        if (!Object.values(FeedBackStatus).includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value",
            });
        }
        const feedback = await feedbackService.updateFeedbackStatus(feedbackId, status, user._id, user.role, io);
        res.status(200).json({
            success: true,
            message: "Feedback status updated",
            data: feedback,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== DELETE FEEDBACK ====================
export const deleteFeedback = async (req, res) => {
    try {
        const user = req.user;
        const io = getIO(req);
        const { feedbackId } = req.params;
        const result = await feedbackService.deleteFeedback(feedbackId, user._id, user.role, io);
        res.status(200).json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET PENDING FEEDBACK ====================
export const getPendingFeedback = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await feedbackService.getPendingFeedback(page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET ALL FEEDBACK (NEW) ====================
export const getAllFeedback = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const orderId = req.query.orderId;
        const result = await feedbackService.getAllFeedback({
            page,
            limit,
            status,
            orderId,
        });
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== FILTER FEEDBACK (NEW) ====================
export const filterFeedback = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const orderId = req.query.orderId;
        const userId = req.query.userId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const result = await feedbackService.filterFeedback({
            page,
            limit,
            status,
            orderId,
            userId,
            startDate,
            endDate,
        });
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET FEEDBACK BY ID ====================
export const getFeedbackById = async (req, res) => {
    try {
        const user = req.user;
        const { feedbackId } = req.params;
        const feedback = await feedbackService.getFeedbackById(feedbackId, user._id, user.role);
        res.status(200).json({
            success: true,
            data: feedback,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
// ==================== GET FEEDBACK BY ORDER ID ====================
export const getFeedbackByOrderId = async (req, res) => {
    try {
        const user = req.user;
        const { orderId } = req.params;
        const feedback = await feedbackService.getFeedbackByOrderId(orderId, user._id, user.role);
        res.status(200).json({
            success: true,
            data: feedback,
            count: feedback.length,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getUserFeedback = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status; // Get status from query
        const result = await feedbackService.getUserFeedback(user._id, page, limit, status);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=feedbackController.js.map