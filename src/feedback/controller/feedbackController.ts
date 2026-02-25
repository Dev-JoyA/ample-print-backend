import { Request, Response } from "express";
import { Types } from "mongoose";
import * as feedbackService from "../service/feedbackService.js";

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

// ==================== CREATE FEEDBACK ====================
export const createFeedback = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const io = getIO(req); // Get socket instance

    const { orderId, designId, message } = req.body;
    const files = req.files as Express.Multer.File[];

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

    const feedback = await feedbackService.createCustomerFeedback(
      {
        orderId,
        designId,
        message,
        attachments,
      },
      user._id,
      io,
    );

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== ADMIN RESPOND TO FEEDBACK ====================
export const respondToFeedback = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const io = getIO(req);
    const { feedbackId } = req.params;
    const { response } = req.body;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Response message is required",
      });
    }

    const feedback = await feedbackService.adminRespondToFeedback(
      feedbackId,
      response,
      user._id,
      io,
    );

    res.status(200).json({
      success: true,
      message: "Response submitted successfully",
      data: feedback,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== UPDATE FEEDBACK STATUS ====================
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const io = getIO(req);
    const { feedbackId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const feedback = await feedbackService.updateFeedbackStatus(
      feedbackId,
      status,
      user._id,
      user.role,
      io,
    );

    res.status(200).json({
      success: true,
      message: "Feedback status updated",
      data: feedback,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== DELETE FEEDBACK ====================
export const deleteFeedback = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const io = getIO(req);
    const { feedbackId } = req.params;

    const result = await feedbackService.deleteFeedback(
      feedbackId,
      user._id,
      user.role,
      io,
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET PENDING FEEDBACK ====================
export const getPendingFeedback = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await feedbackService.getPendingFeedback(page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET FEEDBACK BY ID ====================
export const getFeedbackById = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const { feedbackId } = req.params;

    const feedback = await feedbackService.getFeedbackById(
      feedbackId,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET FEEDBACK BY ORDER ID ====================
export const getFeedbackByOrderId = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const { orderId } = req.params;

    const feedback = await feedbackService.getFeedbackByOrderId(
      orderId,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET USER FEEDBACK ====================
export const getUserFeedback = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await feedbackService.getUserFeedback(user._id, page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
