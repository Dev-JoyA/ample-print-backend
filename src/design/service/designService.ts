import {
  Order,
  OrderStatus,
  PaymentStatus,
} from "../../order/model/orderModel.js";
import { Design, IDesign } from "../model/designModel.js";
import { User } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { Server } from "socket.io";
import emailService from "../../utils/email.js";
import { Product } from "../../product/model/productModel.js";
import { Invoice } from "../../invoice/model/invoiceModel.js"; // ✅ Add this import
import path from "path";
import fs from "fs/promises";

export interface IDesignFilter {
  userId?: string;
  orderId?: string;
  productId?: string;
  uploadedBy?: string;
  isApproved?: boolean;
  minVersion?: number;
  maxVersion?: number;
  startDate?: Date;
  endDate?: Date;
}

// ==================== HELPER: Validate Payment Before Design Upload ====================
const validatePaymentForDesign = async (orderId: string): Promise<void> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Check if order has an invoice
  if (!order.invoiceId) {
    throw new Error(
      "No invoice created for this order yet. Please wait for invoice.",
    );
  }

  const invoice = await Invoice.findById(order.invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // If full payment required
  if (order.requiredPaymentType === "full") {
    if (order.paymentStatus !== PaymentStatus.Completed) {
      throw new Error("Full payment required before design can be uploaded");
    }
    return;
  }

  // If part payment required
  if (order.requiredPaymentType === "part") {
    if (order.paymentStatus !== PaymentStatus.PartPayment) {
      throw new Error("Deposit payment required before design can be uploaded");
    }

    // Verify deposit amount meets requirement
    if (order.amountPaid < (order.requiredDeposit || 0)) {
      throw new Error(
        `Deposit of at least ${order.requiredDeposit} required before design can be uploaded`,
      );
    }
    return;
  }

  throw new Error("Payment requirements not set for this order");
};

// ==================== UPLOAD DESIGN ====================
export const uploadDesign = async (
  id: string,
  data: IDesign,
  io: Server,
): Promise<IDesign> => {
  const order = await Order.findById(id).exec();
  if (!order) {
    throw new Error("No Order found for this design");
  }

  // ✅ NEW: Validate payment before allowing design upload
  await validatePaymentForDesign(order._id.toString());

  // Check order status
  if (order.status === OrderStatus.Completed) {
    throw new Error("Design cannot be uploaded for a completed order.");
  }

  if (order.status === OrderStatus.Cancelled) {
    throw new Error("Design cannot be uploaded for a cancelled order.");
  }

  if (order.status === OrderStatus.Delivered) {
    throw new Error("Design cannot be uploaded for a delivered order.");
  }

  // Check if design can be uploaded at this stage
  const allowedStatuses = [
    OrderStatus.OrderReceived,
    OrderStatus.FilesUploaded,
    OrderStatus.InvoiceSent,
    OrderStatus.AwaitingPartPayment,
    OrderStatus.PartPaymentMade,
    OrderStatus.UnderReview,
  ];

  if (!allowedStatuses.includes(order.status)) {
    throw new Error(
      `Design cannot be uploaded when order is in ${order.status} status`,
    );
  }

  const lastDesign = await Design.findOne({ orderId: order._id }).sort({
    version: -1,
  });
  const newVersion = lastDesign ? lastDesign.version + 1 : 1;

  if (!data.designUrl) {
    throw new Error("A design file must be uploaded.");
  }

  order.status = OrderStatus.DesignUploaded;
  await order.save();

  const design = await Design.create({
    userId: order.userId,
    orderId: order._id,
    productId: data.productId,
    uploadedBy: data.uploadedBy,
    version: newVersion,
    isApproved: false,
    designUrl: data.designUrl,
    otherImage: data.otherImage,
    createdAt: new Date(),
  });

  const user = await User.findById(order.userId).exec();
  if (!user) {
    throw new Error("User not found");
  }
  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) {
    throw new Error("Profile not found");
  }

  io.to("superadmin-room").emit("designUploaded", {
    orderId: design.orderId,
    orderNumber: order.orderNumber,
    designUrl: design.designUrl,
    uploadedBy: design.uploadedBy,
  });

  io.to("admin-room").emit("designUploaded", {
    orderId: design.orderId,
    orderNumber: order.orderNumber,
    designUrl: design.designUrl,
  });

  const productInOrder = order.items.find(
    (item) => item.productId.toString() === data.productId.toString(),
  );

  if (!productInOrder) {
    throw new Error("The selected product is not part of this order.");
  }

  const productName = productInOrder.productName;

  // Send email notification
  await emailService
    .sendDesignReady(
      user.email,
      profile.firstName,
      order.orderNumber,
      productName,
      `${process.env.FRONTEND_URL}/orders/${order.orderNumber}/design` ||
        `http://localhost:4001/orders/${order.orderNumber}/design`,
    )
    .catch((err) => console.error("Error sending design ready email:", err));

  return design;
};

// ==================== UPDATE DESIGN ====================
export const updateDesign = async (
  id: string,
  data: Partial<IDesign>,
  io: Server,
): Promise<IDesign> => {
  if (!data.productId) {
    throw new Error("productId is required for design upload.");
  }

  const updatedDesign = await Design.findByIdAndUpdate(
    id,
    { ...data },
    { new: true, runValidators: true },
  );

  if (!updatedDesign) throw new Error("Design not found");
  updatedDesign.updatedAt = new Date();

  await updatedDesign.save();

  const user = await User.findById(updatedDesign.userId).exec();
  if (!user) {
    throw new Error("User not found");
  }
  const profile = await Profile.findOne({ userId: user._id }).exec();
  const product = await Product.findOne({
    _id: updatedDesign.productId,
  }).exec();
  const order = await Order.findById(updatedDesign.orderId).exec();

  if (!profile || !order || !product) {
    throw new Error("Missing related profile/order/product data");
  }

  const productName = product.name;
  const orderNumber = order.orderNumber;

  // Send email notification for update
  await emailService
    .sendDesignReady(
      user.email,
      profile.firstName,
      orderNumber,
      productName,
      `${process.env.FRONTEND_URL}/orders/${orderNumber}/design` ||
        `http://localhost:4001/orders/${orderNumber}/design`,
    )
    .catch((err) => console.error("Error sending design update email:", err));

  io.to("superadmin-room").emit("designUploaded", {
    designId: updatedDesign._id,
    orderId: updatedDesign.orderId,
    orderNumber: orderNumber,
    designUrl: updatedDesign.designUrl,
    uploadedBy: updatedDesign.uploadedBy,
  });

  io.to("admin-room").emit("designUpdated", {
    designId: updatedDesign._id,
    orderId: updatedDesign.orderId,
    orderNumber: orderNumber,
  });

  return updatedDesign;
};

// ==================== DELETE DESIGN ====================
export const deleteDesign = async (id: string): Promise<string> => {
  const design = await Design.findById(id);
  if (!design) throw new Error("Design not found");

  // Delete all associated files
  const filesToDelete = [design.designUrl, ...(design.otherImage || [])].filter(
    Boolean,
  );

  for (const fileUrl of filesToDelete) {
    if (fileUrl) {
      const filename = path.basename(fileUrl);
      const filePath = path.join("uploads", filename);
      try {
        await fs.unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
      } catch (err) {
        console.error(`Failed to delete file ${filePath}:`, err);
        // Continue even if file delete fails
      }
    }
  }

  await Design.findByIdAndDelete(id);
  return "Design deleted successfully";
};

// ==================== APPROVE DESIGN ====================
export const approveDesign = async (id: string): Promise<IDesign> => {
  const design = await Design.findById(id);
  if (!design) throw new Error("Design not found");

  design.isApproved = true;
  design.approvedAt = new Date();
  await design.save();

  // Update order status
  const order = await Order.findById(design.orderId).exec();
  if (order) {
    order.status = OrderStatus.Approved;
    await order.save();

    // Socket notification
    const io = (global as any).io; // You might need to pass io properly
    if (io) {
      io.to(`user-${order.userId}`).emit("order-status-updated", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: OrderStatus.Approved,
      });
    }
  }

  // Send design approved email
  const user = await User.findById(design.userId).exec();
  const profile = await Profile.findOne({ userId: design.userId }).exec();
  const product = await Product.findById(design.productId).exec();

  if (user && profile && order && product) {
    // Calculate estimated delivery (you might want to get this from settings)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    await emailService
      .sendDesignApproved(
        user.email,
        profile.firstName,
        order.orderNumber,
        product.name,
        "3-5", // Production time
        estimatedDelivery.toLocaleDateString(),
      )
      .catch((err) =>
        console.error("Error sending design approved email:", err),
      );
  }

  return design;
};

// ==================== GET DESIGN BY ID ====================
export const getDesignById = async (id: string): Promise<IDesign> => {
  const design = await Design.findById(id)
    .populate("userId", "email")
    .populate("orderId")
    .populate("productId")
    .populate("uploadedBy", "email");
  if (!design) throw new Error("Design not found");

  return design;
};

// ==================== GET USER DESIGNS ====================
export const getUserDesigns = async (userId: string): Promise<IDesign[]> => {
  const designs = await Design.find({ userId })
    .populate("orderId")
    .populate("productId")
    .sort({ createdAt: -1 })
    .exec();

  return designs; // Return empty array instead of throwing error
};

// ==================== GET DESIGNS BY ORDER ID ====================
export const getDesignsByOrderId = async (
  orderId: string,
): Promise<IDesign[]> => {
  const designs = await Design.find({ orderId })
    .populate("productId")
    .sort({ version: -1 })
    .exec();

  return designs; // Return empty array instead of throwing error
};

// ==================== FILTER DESIGNS ====================
export const filterDesigns = async (filters: IDesignFilter) => {
  const query: any = {};

  if (filters.userId) query.userId = filters.userId;
  if (filters.orderId) query.orderId = filters.orderId;
  if (filters.productId) query.productId = filters.productId;
  if (filters.uploadedBy) query.uploadedBy = filters.uploadedBy;
  if (filters.isApproved !== undefined) query.isApproved = filters.isApproved;

  if (filters.minVersion !== undefined || filters.maxVersion !== undefined) {
    query.version = {};
    if (filters.minVersion !== undefined)
      query.version.$gte = filters.minVersion;
    if (filters.maxVersion !== undefined)
      query.version.$lte = filters.maxVersion;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate) query.createdAt.$lte = filters.endDate;
  }

  const designs = await Design.find(query)
    .populate("orderId")
    .populate("productId")
    .populate("uploadedBy")
    .sort({ createdAt: -1 });

  return designs;
};

// ==================== GET DESIGNS BY PRODUCT ID ====================
export const getDesignByProductId = async (
  productId: string,
): Promise<IDesign[]> => {
  const designs = await Design.find({ productId })
    .populate("orderId")
    .sort({ version: -1 })
    .exec();

  return designs; // Return empty array instead of throwing error
};

// ==================== GET ALL DESIGNS ====================
export const getAllDesigns = async (): Promise<IDesign[]> => {
  return Design.find()
    .populate("userId")
    .populate("orderId")
    .populate("productId")
    .populate("uploadedBy")
    .sort({ createdAt: -1 })
    .exec();
};
