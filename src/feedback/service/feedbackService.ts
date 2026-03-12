import { Feedback, IFeedback, FeedBackStatus } from "../model/feedback.js";
import { Types } from "mongoose";
import { Order } from "../../order/model/orderModel.js";
import { Design } from "../../design/model/designModel.js";
import { User, UserRole } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { Server } from "socket.io";
import { notificationService } from "../../notification/service/notificationService.js";

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

  // Get user profile for customer name
  const profile = await Profile.findOne({ userId });

  // ===== SOCKET NOTIFICATIONS =====
  const notificationData = {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: (feedback.orderId as any).orderNumber,
    ...(data.designId && { designId: data.designId }),
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

  // Get admin details for notification
  const admin = await User.findById(adminId);
  const adminProfile = await Profile.findOne({ userId: adminId });

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

  // Notify admin room that this feedback is resolved (for badge updates)
  io.to("admin-room").emit("feedback-resolved", {
    feedbackId: feedback._id,
    orderId: feedback.orderId,
    orderNumber: order.orderNumber,
    resolvedBy: adminId,
    timestamp: new Date(),
  });

  // ✅ CREATE DATABASE NOTIFICATION FOR OTHER ADMINS (excluding the responder)
  try {
    await notificationService.createForAdmins({
      type: 'admin-feedback-resolved',
      title: 'Feedback Resolved',
      message: `Feedback #${feedback._id.toString().slice(-6)} for order #${order.orderNumber} was resolved by ${adminProfile?.firstName || admin?.email || 'Admin'}`,
      data: {
        feedbackId: feedback._id,
        orderId: feedback.orderId,
        orderNumber: order.orderNumber,
        customerId: feedback.userId,
        resolvedBy: adminId,
        resolverName: adminProfile?.firstName || admin?.email || 'Admin'
      },
      link: `/dashboards/admin/feedback/${feedback._id}`
    }); // Exclude the responder
  } catch (notifErr) {
    console.error('Failed to create admin feedback resolved notification:', notifErr);
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

  const oldStatus = feedback.status;
  feedback.status = status;
  await feedback.save();

  const order = await Order.findById(feedback.orderId).select("orderNumber");
  const user = await User.findById(feedback.userId);
  const profile = await Profile.findOne({ userId: feedback.userId });

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

  // ✅ CREATE DATABASE NOTIFICATION FOR ADMINS (for significant status changes)
  if (status === FeedBackStatus.Resolved || status === FeedBackStatus.Reviewed) {
    try {
      await notificationService.createForAdmins({
        type: 'admin-feedback-status-updated',
        title: 'Feedback Status Updated',
        message: `Feedback for order #${order?.orderNumber} status changed from ${oldStatus} to ${status}`,
        data: {
          feedbackId: feedback._id,
          orderId: feedback.orderId,
          orderNumber: order?.orderNumber,
          oldStatus,
          newStatus: status,
          customerId: feedback.userId,
          updatedBy: userId,
          updaterRole: userRole
        },
        link: `/dashboards/admin/feedback/${feedback._id}`
      }); // Exclude the updater
    } catch (notifErr) {
      console.error('Failed to create admin feedback status notification:', notifErr);
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

  // ✅ CREATE DATABASE NOTIFICATIONS
  try {
    // 1. Notify customer if deleted by admin
    if (userRole !== "customer" && user && order) {
      await notificationService.createForUser(feedback.userId, {
        type: 'feedback-deleted',
        title: 'Feedback Deleted',
        message: `Your feedback for order #${order.orderNumber} has been deleted by an administrator`,
        data: {
          feedbackId: feedback._id,
          orderId: feedback.orderId,
          orderNumber: order.orderNumber,
          deletedBy: userId,
          deleterRole: userRole
        },
        link: `/orders/${order._id}`
      });
    }

    // 2. Notify other admins about deletion (if deleted by admin)
    if (userRole !== "customer") {
      await notificationService.createForAdmins({
        type: 'admin-feedback-deleted',
        title: 'Feedback Deleted',
        message: `Feedback for order #${order?.orderNumber} was deleted by ${userRole === UserRole.SuperAdmin ? 'Super Admin' : 'Admin'}`,
        data: {
          feedbackId: feedback._id,
          orderId: feedback.orderId,
          orderNumber: order?.orderNumber,
          customerId: feedback.userId,
          customerName: profile?.firstName || 'Customer',
          deletedBy: userId,
          deleterRole: userRole
        },
        link: `/dashboards/admin/feedback`
      }); // Exclude the deleter
    }
  } catch (notifErr) {
    console.error('Failed to create feedback deletion notifications:', notifErr);
  }

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