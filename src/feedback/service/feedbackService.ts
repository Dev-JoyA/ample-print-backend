import { Feedback, IFeedback, FeedBackStatus } from "../model/feedback.js";
import { Types } from "mongoose";
import { Order } from "../../order/model/orderModel.js"
import { Design } from "../../design/model/designModel.js";


export const createCustomerFeedback = async (
  data: {
    orderId: string;
    designId?: string;
    message: string;
    attachments?: string[];
  },
  userId: string
): Promise<IFeedback> => {
  // Validate order exists and belongs to customer
  const order = await Order.findOne({ 
    _id: data.orderId, 
    userId: userId 
  });
  
  if (!order) {
    throw new Error("Order not found or unauthorized");
  }

  // If designId is provided, validate it belongs to this order
  if (data.designId) {
    const design = await Design.findOne({
      _id: data.designId,
      orderId: data.orderId
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
    status: FeedBackStatus.Pending
  });

  await feedback.save();
  return feedback;
};

// ==================== ADMIN RESPONDS TO FEEDBACK ====================
// PUT /api/admin/feedback/:feedbackId/respond
export const adminRespondToFeedback = async (
  feedbackId: string,
  response: string,
  adminId: string
): Promise<IFeedback | null> => {
  const feedback = await Feedback.findById(feedbackId);
  
  if (!feedback) {
    throw new Error("Feedback not found");
  }

  feedback.adminResponse = response;
  feedback.respondedBy = new Types.ObjectId(adminId);
  feedback.adminResponseAt = new Date();
  feedback.status = FeedBackStatus.Resolved;

  await feedback.save();
  return feedback;
};

// ==================== GET FEEDBACK BY ID ====================
// GET /api/feedback/:feedbackId
export const getFeedbackById = async (
  feedbackId: string,
  userId: string,
  userRole: string
): Promise<IFeedback | null> => {
  const feedback = await Feedback.findById(feedbackId)
    .populate("userId", "fullname email")
    .populate("respondedBy", "fullname email")
    .populate("orderId", "orderNumber")
    .populate("designId", "designUrl filename")
    .exec();

  if (!feedback) return null;

  // Check authorization
  if (userRole === "customer" && feedback.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this feedback");
  }

  return feedback;
};

// ==================== GET FEEDBACK FOR ORDER ====================
// GET /api/orders/:orderId/feedback
export const getFeedbackByOrder = async (
  orderId: string,
  userId: string,
  userRole: string
): Promise<IFeedback[]> => {
  // Verify access
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  if (userRole === "customer" && order.userId.toString() !== userId) {
    throw new Error("Unauthorized");
  }

  return Feedback.find({ orderId: new Types.ObjectId(orderId) })
    .populate("userId", "fullname email")
    .populate("respondedBy", "fullname email")
    .populate("designId", "designUrl")
    .sort({ createdAt: -1 })
    .exec();
};

// ==================== GET FEEDBACK FOR DESIGN ====================
// GET /api/designs/:designId/feedback
export const getFeedbackByDesign = async (
  designId: string,
  userId: string,
  userRole: string
): Promise<IFeedback[]> => {
  const design = await Design.findById(designId);
  if (!design) throw new Error("Design not found");

  // Check if user has access to this design's order
  const order = await Order.findById(design.orderId);
  if (!order) throw new Error("Order not found");

  if (userRole === "customer" && order.userId.toString() !== userId) {
    throw new Error("Unauthorized");
  }

  return Feedback.find({ designId: new Types.ObjectId(designId) })
    .populate("userId", "fullname email")
    .populate("respondedBy", "fullname email")
    .sort({ createdAt: -1 })
    .exec();
};

// ==================== GET PENDING FEEDBACK (ADMIN DASHBOARD) ====================
// GET /api/admin/feedback/pending
export const getPendingFeedback = async (
  page: number = 1,
  limit: number = 10
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Feedback.countDocuments({ status: FeedBackStatus.Pending })
  ]);

  return {
    feedback,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// ==================== GET ALL FEEDBACK (ADMIN) ====================
// GET /api/admin/feedback
export const getAllFeedback = async (
  filters: {
    status?: FeedBackStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  feedback: IFeedback[];
  total: number;
  page: number;
  pages: number;
}> => {
  const {
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10
  } = filters;

  const query: any = {};

  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const skip = (page - 1) * limit;

  const [feedback, total] = await Promise.all([
    Feedback.find(query)
      .populate("userId", "fullname email")
      .populate("respondedBy", "fullname email")
      .populate("orderId", "orderNumber")
      .populate("designId", "designUrl filename")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Feedback.countDocuments(query)
  ]);

  return {
    feedback,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// ==================== UPDATE FEEDBACK STATUS ====================
// PATCH /api/admin/feedback/:feedbackId/status
export const updateFeedbackStatus = async (
  feedbackId: string,
  status: FeedBackStatus
): Promise<IFeedback | null> => {
  const feedback = await Feedback.findByIdAndUpdate(
    feedbackId,
    { status },
    { new: true }
  );

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  return feedback;
};

// ==================== DELETE FEEDBACK ====================
// DELETE /api/admin/feedback/:feedbackId
export const deleteFeedback = async (
  feedbackId: string
): Promise<{ message: string }> => {
  const feedback = await Feedback.findByIdAndDelete(feedbackId);
  
  if (!feedback) {
    throw new Error("Feedback not found");
  }

  return { message: "Feedback deleted successfully" };
};