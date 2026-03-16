import { Feedback, IFeedback, FeedBackStatus } from "../model/feedback.js";
import { Types } from "mongoose";
import { Order } from "../../order/model/orderModel.js";
import { Design } from "../../design/model/designModel.js";
import { User, UserRole } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { Server } from "socket.io";
import { notificationService } from "../../notification/service/notificationService.js";

interface FeedbackFilterOptions {
  page?: number;
  limit?: number;
  status?: FeedBackStatus;
  orderId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

// ==================== CREATE CUSTOMER FEEDBACK ====================
export const createCustomerFeedback = async (
  data: {
    orderId: string;
    designId?: string;
    message: string;
    attachments?: string[];
  },
  userId: string,
  io: Server,
): Promise<IFeedback> => {
  // Validate order exists and belongs to customer
  const order = await Order.findOne({
    _id: data.orderId,
    userId: userId,
  });

  if (!order) {
    throw new Error("Order not found or unauthorized");
  }

  // Validate message exists
  if (!data.message || data.message.trim().length === 0) {
    throw new Error("Feedback message is required");
  }

  // If designId is provided, validate it belongs to this order
  if (data.designId) {
    const design = await Design.findOne({
      _id: data.designId,
      orderId: data.orderId,
    }).populate("productId");

    if (!design) {
      throw new Error("Design not found for this order");
    }
  }

  // Create feedback
  const feedback = new Feedback({
    userId: new Types.ObjectId(userId),
    orderId: new Types.ObjectId(data.orderId),
    ...(data.designId && { designId: new Types.ObjectId(data.designId) }),
    message: data.message,
    attachment: data.attachments || [],
    status: FeedBackStatus.Pending,
  });

  await feedback.save();

  // Populate for response
  await feedback.populate([
    { path: "userId", select: "fullname email" },
    { path: "orderId", select: "orderNumber" },
    { 
      path: "designId", 
      populate: { path: "productId", select: "name price images" }
    },
  ]);

  // Get user profile for customer name
  const profile = await Profile.findOne({ userId });

  // ===== SOCKET NOTIFICATIONS =====
  const notificationData = {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: (feedback.orderId as any).orderNumber,
    ...(data.designId && { 
      designId: data.designId,
      productName: (feedback.designId as any)?.productId?.name || "Unknown Product"
    }),
    message:
      data.message.substring(0, 50) + (data.message.length > 50 ? "..." : ""),
    customerName: (feedback.userId as any)?.fullname || profile?.firstName || "Customer",
    priority: "high",
    timestamp: new Date(),
  };

  io.to("admin-room").emit("new-feedback", notificationData);
  io.to("superadmin-room").emit("new-feedback", notificationData);

  // ✅ CREATE DATABASE NOTIFICATIONS FOR ADMINS
  try {
    await notificationService.createForAdmins({
      type: 'new-feedback',
      title: 'New Feedback Received',
      message: `Customer ${profile?.firstName || 'Customer'} submitted feedback for order #${(feedback.orderId as any).orderNumber}`,
      data: {
        feedbackId: feedback._id,
        orderId: feedback.orderId,
        orderNumber: (feedback.orderId as any).orderNumber,
        designId: data.designId,
        productName: (feedback.designId as any)?.productId?.name,
        messagePreview: notificationData.message,
        customerId: userId,
        customerName: profile?.firstName || 'Customer',
        hasAttachments: !!(data.attachments && data.attachments.length > 0)
      },
      link: `/dashboards/admin/feedback/${feedback._id}`
    });
    
  } catch (notifErr) {
    console.error('Failed to create admin feedback notification:', notifErr);
  }

  // Update pending count for admin badges
  const pendingCount = await Feedback.countDocuments({
    status: FeedBackStatus.Pending,
  });
  io.to("admin-room").emit("pending-feedback-count", {
    count: pendingCount,
    timestamp: new Date(),
  });

  return feedback;
};

export const adminRespondToFeedback = async (
  feedbackId: string,
  response: string,
  attachments: string[],  // Add this parameter
  adminId: string,
  io: Server,
): Promise<IFeedback> => {
  // Validate response
  if (!response || response.trim().length === 0) {
    throw new Error("Admin response cannot be empty");
  }

  const feedback = await Feedback.findById(feedbackId);

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  // Check if already resolved
  if (feedback.status === FeedBackStatus.Resolved) {
    throw new Error("This feedback has already been resolved");
  }

  const order = await Order.findById(feedback.orderId).select("orderNumber userId");
  if (!order) {
    throw new Error("Order not found");
  }

  // Get admin details for notification
  const admin = await User.findById(adminId);
  const adminProfile = await Profile.findOne({ userId: adminId });

  // Update feedback with response and attachments
  feedback.adminResponse = response;
  feedback.respondedBy = new Types.ObjectId(adminId);
  feedback.adminResponseAt = new Date();
  feedback.status = FeedBackStatus.Reviewed;
  
  // Add attachments if your schema supports it
  // You might need to add this field to your Feedback model
  if (attachments && attachments.length > 0) {
    (feedback as any).adminAttachments = attachments;
  }

  await feedback.save();

  // Populate for response
  await feedback.populate([
    { path: "userId", select: "fullname email" },
    { path: "orderId", select: "orderNumber" },
    { path: "respondedBy", select: "fullname email" },
    { 
      path: "designId", 
      populate: { path: "productId", select: "name price images" }
    },
  ]);

  // ===== SOCKET NOTIFICATIONS =====
  io.to(`user-${feedback.userId}`).emit("feedback-response", {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: order.orderNumber,
    ...(feedback.designId && { designId: feedback.designId }),
    message: "Admin has responded to your feedback",
    response: response,
    timestamp: new Date(),
  });

  // ✅ CREATE DATABASE NOTIFICATION FOR CUSTOMER
  try {
    await notificationService.createForUser(feedback.userId, {
      type: 'feedback-response',
      title: 'Response to Your Feedback',
      message: `Admin has responded to your feedback for order #${order.orderNumber}`,
      data: {
        feedbackId: feedback._id,
        orderId: feedback.orderId,
        orderNumber: order.orderNumber,
        designId: feedback.designId,
        response: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
        adminName: adminProfile?.firstName || admin?.email || 'Admin',
        adminId
      },
      link: `/orders/${order._id}/feedback`
    });
  } catch (notifErr) {
    console.error('Failed to create feedback response notification:', notifErr);
  }

  // Update pending count for admin badges
  const pendingCount = await Feedback.countDocuments({
    status: FeedBackStatus.Pending,
  });
  io.to("admin-room").emit("pending-feedback-count", {
    count: pendingCount,
    timestamp: new Date(),
  });

  return feedback;
};

// ==================== UPDATE FEEDBACK STATUS ====================
export const updateFeedbackStatus = async (
  feedbackId: string,
  status: FeedBackStatus,
  userId: string,
  userRole: string,
  io: Server,
): Promise<IFeedback> => {
  const feedback = await Feedback.findById(feedbackId);

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  // Role-based validation
  if (userRole === "Customer") {
    // Customers cannot update feedback status
    throw new Error("Customers are not allowed to update feedback status");
  }

  // Don't allow changing resolved feedback
  if (
    feedback.status === FeedBackStatus.Resolved &&
    status !== FeedBackStatus.Resolved
  ) {
    throw new Error("Cannot change status of resolved feedback");
  }

  const oldStatus = feedback.status;
  feedback.status = status;
  await feedback.save();

  const order = await Order.findById(feedback.orderId).select("orderNumber");
  const user = await User.findById(feedback.userId);
  const profile = await Profile.findOne({ userId: feedback.userId });

  // Populate for response
  await feedback.populate([
    { path: "userId", select: "fullname email" },
    { path: "orderId", select: "orderNumber" },
    { 
      path: "designId", 
      populate: { path: "productId", select: "name price images" }
    },
  ]);

  // ===== SOCKET NOTIFICATIONS =====
  const statusData = {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: order?.orderNumber,
    oldStatus,
    newStatus: status,
    updatedBy: userRole,
    timestamp: new Date(),
  };

  io.to(`user-${feedback.userId}`).emit("feedback-status-updated", statusData);
  io.to("admin-room").emit("feedback-status-updated", statusData);

  // ✅ CREATE DATABASE NOTIFICATION FOR CUSTOMER
  if (user && order) {
    try {
      let title = 'Feedback Status Updated';
      let message = `Your feedback for order #${order.orderNumber} status changed from ${oldStatus} to ${status}`;
      
      if (status === FeedBackStatus.Resolved) {
        title = 'Feedback Resolved';
        message = `Your feedback for order #${order.orderNumber} has been marked as resolved`;
      } else if (status === FeedBackStatus.Reviewed) {
        title = 'Feedback Reviewed';
        message = `Your feedback for order #${order.orderNumber} has been reviewed`;
      }

      await notificationService.createForUser(feedback.userId, {
        type: 'feedback-status-updated',
        title,
        message,
        data: {
          feedbackId: feedback._id,
          orderId: feedback.orderId,
          orderNumber: order.orderNumber,
          oldStatus,
          newStatus: status,
          updatedBy: userId,
          updaterRole: userRole
        },
        link: `/orders/${order._id}/feedback`
      });
    } catch (notifErr) {
      console.error('Failed to create feedback status notification:', notifErr);
    }
  }

  // Update pending count if status changed to/from pending
  if (
    oldStatus === FeedBackStatus.Pending ||
    status === FeedBackStatus.Pending
  ) {
    const pendingCount = await Feedback.countDocuments({
      status: FeedBackStatus.Pending,
    });
    io.to("admin-room").emit("pending-feedback-count", {
      count: pendingCount,
      timestamp: new Date(),
    });
  }

  return feedback;
};

// ==================== GET ALL FEEDBACK (NEW) ====================
export const getAllFeedback = async (options: FeedbackFilterOptions): Promise<{
  feedback: IFeedback[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> => {
  const { page = 1, limit = 10, status, orderId } = options;
  const skip = (page - 1) * limit;

  const query: any = {};

  if (status) {
    query.status = status;
  }

  if (orderId) {
    query.orderId = new Types.ObjectId(orderId);
  }

  const [feedback, total] = await Promise.all([
    Feedback.find(query)
      .populate("userId", "fullname email")
      .populate("orderId", "orderNumber userId")
      .populate({
        path: "designId",
        populate: { path: "productId", select: "name price images" }
      })
      .populate("respondedBy", "fullname email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Feedback.countDocuments(query),
  ]);

  return {
    feedback,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

// ==================== FILTER FEEDBACK (NEW) ====================
export const filterFeedback = async (filters: FeedbackFilterOptions): Promise<{
  feedback: IFeedback[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> => {
  const { page = 1, limit = 10, status, orderId, userId, startDate, endDate } = filters;
  const skip = (page - 1) * limit;

  const query: any = {};

  if (status) {
    query.status = status;
  }

  if (orderId) {
    query.orderId = new Types.ObjectId(orderId);
  }

  if (userId) {
    query.userId = new Types.ObjectId(userId);
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const [feedback, total] = await Promise.all([
    Feedback.find(query)
      .populate("userId", "fullname email")
      .populate("orderId", "orderNumber userId")
      .populate({
        path: "designId",
        populate: { path: "productId", select: "name price images" }
      })
      .populate("respondedBy", "fullname email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Feedback.countDocuments(query),
  ]);

  return {
    feedback,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

// ==================== GET PENDING FEEDBACK ====================
export const getPendingFeedback = async (
  page: number = 1,
  limit: number = 10,
): Promise<{
  feedback: IFeedback[];
  total: number;
  page: number;
  pages: number;
}> => {
  const skip = (page - 1) * limit;

  const [feedback, total] = await Promise.all([
    Feedback.find({ status: FeedBackStatus.Pending })
      .populate("userId", "fullname email")
      .populate("orderId", "orderNumber")
      .populate({
        path: "designId",
        populate: { path: "productId", select: "name" }
      })
      .populate("respondedBy", "fullname email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Feedback.countDocuments({ status: FeedBackStatus.Pending }),
  ]);

  return {
    feedback,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

// ==================== GET FEEDBACK BY ID ====================
export const getFeedbackById = async (
  feedbackId: string,
  userId: string,
  userRole: string,
): Promise<IFeedback | null> => {
  const feedback = await Feedback.findById(feedbackId)
    .populate("userId", "fullname email")
    .populate("orderId", "orderNumber status")
    .populate({
      path: "designId",
      populate: { path: "productId", select: "name price images" }
    })
    .populate("respondedBy", "fullname email")
    .exec();

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  // Check authorization
  if (userRole === "Customer" && feedback.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this feedback");
  }

  return feedback;
};

// ==================== GET FEEDBACK BY ORDER ID ====================
export const getFeedbackByOrderId = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<IFeedback[]> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  // Check authorization
  if (userRole === "Customer" && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view feedback for this order");
  }

  return Feedback.find({ orderId: new Types.ObjectId(orderId) })
    .populate("userId", "fullname email")
    .populate({
      path: "designId",
      populate: { path: "productId", select: "name" }
    })
    .populate("respondedBy", "fullname email")
    .sort({ createdAt: -1 })
    .exec();
};

export const getUserFeedback = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  status?: FeedBackStatus, // Add this parameter
): Promise<{
  feedback: IFeedback[];
  total: number;
  page: number;
  pages: number;
}> => {
  const skip = (page - 1) * limit;
  
  const query: any = { userId: new Types.ObjectId(userId) };
  
  // Add status filter if provided
  if (status) {
    query.status = status;
  }

  const [feedback, total] = await Promise.all([
    Feedback.find(query)
      .populate("orderId", "orderNumber")
      .populate({
        path: "designId",
        populate: { path: "productId", select: "name" }
      })
      .populate("respondedBy", "fullname email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Feedback.countDocuments(query),
  ]);

  return {
    feedback,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

// ==================== DELETE FEEDBACK ====================
export const deleteFeedback = async (
  feedbackId: string,
  userId: string,
  userRole: string,
  io: Server,
): Promise<{ message: string }> => {
  const feedback = await Feedback.findById(feedbackId);

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  // Role-based deletion
  if (userRole === "Customer") {
    // Customers can only delete their own pending feedback
    if (feedback.userId.toString() !== userId) {
      throw new Error("Unauthorized to delete this feedback");
    }

    if (feedback.status !== FeedBackStatus.Pending) {
      throw new Error("Can only delete pending feedback");
    }
  }

  const order = await Order.findById(feedback.orderId).select("orderNumber");
  const user = await User.findById(feedback.userId);
  const profile = await Profile.findOne({ userId: feedback.userId });

  await Feedback.findByIdAndDelete(feedbackId);

  // ===== SOCKET NOTIFICATIONS =====
  io.to(`user-${feedback.userId}`).emit("feedback-deleted", {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: order?.orderNumber,
    message: "Feedback has been removed",
    timestamp: new Date(),
  });

  io.to("admin-room").emit("feedback-deleted", {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: order?.orderNumber,
    timestamp: new Date(),
  });

  // Update pending count
  const pendingCount = await Feedback.countDocuments({
    status: FeedBackStatus.Pending,
  });
  io.to("admin-room").emit("pending-feedback-count", {
    count: pendingCount,
    timestamp: new Date(),
  });

  return { message: "Feedback deleted successfully" };
};