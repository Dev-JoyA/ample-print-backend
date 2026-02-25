import { Feedback, IFeedback, FeedBackStatus } from "../model/feedback.js";
import { Types } from "mongoose";
import { Order } from "../../order/model/orderModel.js";
import { Design } from "../../design/model/designModel.js";
import { Server } from "socket.io";

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
    });

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
    { path: "designId", select: "designUrl" },
  ]);

  // ===== SOCKET NOTIFICATIONS =====
  const notificationData = {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: (feedback.orderId as any).orderNumber,
    ...(data.designId && { designId: data.designId }),
    message:
      data.message.substring(0, 50) + (data.message.length > 50 ? "..." : ""),
    customerName: (feedback.userId as any)?.fullname,
    priority: "high",
    timestamp: new Date(),
  };

  io.to("admin-room").emit("new-feedback", notificationData);
  io.to("superadmin-room").emit("new-feedback", notificationData);

  return feedback;
};

// ==================== ADMIN RESPONDS TO FEEDBACK ====================
export const adminRespondToFeedback = async (
  feedbackId: string,
  response: string,
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

  const order = await Order.findById(feedback.orderId).select("orderNumber");
  if (!order) {
    throw new Error("Order not found");
  }

  // Update feedback
  feedback.adminResponse = response;
  feedback.respondedBy = new Types.ObjectId(adminId);
  feedback.adminResponseAt = new Date();
  feedback.status = FeedBackStatus.Resolved;

  await feedback.save();

  // Populate for response
  await feedback.populate([
    { path: "userId", select: "fullname email" },
    { path: "orderId", select: "orderNumber" },
    { path: "respondedBy", select: "fullname email" },
  ]);

  // ===== SOCKET NOTIFICATIONS =====
  // Notify the specific customer
  io.to(`user-${feedback.userId}`).emit("feedback-response", {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: order.orderNumber,
    ...(feedback.designId && { designId: feedback.designId }),
    message: "Admin has responded to your feedback",
    response: response,
    timestamp: new Date(),
  });

  // Notify admin room that this feedback is resolved (for badge updates)
  io.to("admin-room").emit("feedback-resolved", {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: order.orderNumber,
    resolvedBy: adminId,
    timestamp: new Date(),
  });

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
  if (userRole === "customer") {
    // Customers cannot update feedback status at all
    throw new Error("Customers are not allowed to update feedback status");
  }

  // Don't allow changing resolved feedback
  if (
    feedback.status === FeedBackStatus.Resolved &&
    status !== FeedBackStatus.Resolved
  ) {
    throw new Error("Cannot change status of resolved feedback");
  }

  feedback.status = status;
  await feedback.save();

  const order = await Order.findById(feedback.orderId).select("orderNumber");

  // ===== SOCKET NOTIFICATIONS =====
  const statusData = {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: order?.orderNumber,
    status: status,
    updatedBy: userRole,
    timestamp: new Date(),
  };

  io.to(`user-${feedback.userId}`).emit("feedback-status-updated", statusData);
  io.to("admin-room").emit("feedback-status-updated", statusData);

  // Update pending count if status changed to/from pending
  if (
    feedback.status === FeedBackStatus.Pending ||
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
  if (userRole === "customer") {
    // Customers can only delete their own pending feedback
    if (feedback.userId.toString() !== userId) {
      throw new Error("Unauthorized to delete this feedback");
    }

    if (feedback.status !== FeedBackStatus.Pending) {
      throw new Error("Can only delete pending feedback");
    }
  }

  const order = await Order.findById(feedback.orderId).select("orderNumber");

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

  // Update pending count for admin badges
  const pendingCount = await Feedback.countDocuments({
    status: FeedBackStatus.Pending,
  });
  io.to("admin-room").emit("pending-feedback-count", {
    count: pendingCount,
    timestamp: new Date(),
  });

  return { message: "Feedback deleted successfully" };
};

// ==================== GET PENDING FEEDBACK ====================
export const getPendingFeedback = async (
  page: number = 1,
  limit: number = 10,
  io?: Server, // Optional, for emitting count
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
      .populate("designId", "designUrl")
      .populate("respondedBy", "fullname email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Feedback.countDocuments({ status: FeedBackStatus.Pending }),
  ]);

  // If io is provided, emit pending count for badges
  if (io) {
    io.to("admin-room").emit("pending-feedback-count", {
      count: total,
      timestamp: new Date(),
    });
  }

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
    .populate("designId", "designUrl filename")
    .populate("respondedBy", "fullname email")
    .exec();

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  // Check authorization
  if (userRole === "customer" && feedback.userId.toString() !== userId) {
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
  if (userRole === "customer" && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view feedback for this order");
  }

  return Feedback.find({ orderId: new Types.ObjectId(orderId) })
    .populate("userId", "fullname email")
    .populate("designId", "designUrl")
    .populate("respondedBy", "fullname email")
    .sort({ createdAt: -1 })
    .exec();
};

// ==================== GET USER FEEDBACK ====================
export const getUserFeedback = async (
  userId: string,
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
    Feedback.find({ userId: new Types.ObjectId(userId) })
      .populate("orderId", "orderNumber")
      .populate("designId", "designUrl")
      .populate("respondedBy", "fullname email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Feedback.countDocuments({ userId: new Types.ObjectId(userId) }),
  ]);

  return {
    feedback,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};
