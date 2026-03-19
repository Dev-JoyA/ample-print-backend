import mongoose from "mongoose";
import {
  Order,
  OrderStatus,
  PaymentStatus,
} from "../../order/model/orderModel.js";
import { Design, IDesign } from "../model/designModel.js";
import { User, UserRole } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { Server } from "socket.io";
import emailService from "../../utils/email.js";
import { Product } from "../../product/model/productModel.js";
import { Invoice } from "../../invoice/model/invoiceModel.js";
import { notificationService } from "../../notification/service/notificationService.js";
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

const validatePaymentForDesign = async (
  orderId: string,
  session?: mongoose.ClientSession,
): Promise<void> => {
  const order = await Order.findById(orderId).session(session || null);
  if (!order) throw new Error("Order not found");

  if (!order.invoiceId) {
    throw new Error("No invoice created for this order yet. Please wait for invoice.");
  }

  const invoice = await Invoice.findById(order.invoiceId).session(session || null);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (order.requiredPaymentType === "full") {
    if (order.paymentStatus !== PaymentStatus.Completed) {
      throw new Error("Full payment required before design can be uploaded");
    }
    return;
  }

  if (order.requiredPaymentType === "part") {
    if (order.paymentStatus !== PaymentStatus.PartPayment) {
      throw new Error("Deposit payment required before design can be uploaded");
    }

    if (order.amountPaid < (order.requiredDeposit || 0)) {
      throw new Error(
        `Deposit of at least ${order.requiredDeposit} required before design can be uploaded`,
      );
    }
    return;
  }

  throw new Error("Payment requirements not set for this order");
};

const areAllProductsApproved = async (
  orderId: string,
  session?: mongoose.ClientSession,
): Promise<boolean> => {
  const order = await Order.findById(orderId).session(session || null);
  if (!order) return false;

  const designs = await Design.find({ orderId }).session(session || null);

  const approvedProducts = new Map();
  designs.forEach(design => {
    const productId = design.productId.toString();
    if (design.isApproved) {
      approvedProducts.set(productId, true);
    }
  });

  const allApproved = order.items.every(item => {
    const productId = item.productId.toString();
    return approvedProducts.has(productId);
  });

  return allApproved;
};

const hasAnyDesigns = async (
  orderId: string,
  session?: mongoose.ClientSession,
): Promise<boolean> => {
  const count = await Design.countDocuments({ orderId }).session(session || null);
  return count > 0;
};

export const uploadDesign = async (
  id: string,
  data: IDesign,
  io: Server,
): Promise<IDesign> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🔍 Service - Looking for order with ID:', id);
    
    const order = await Order.findById(id).session(session).exec();
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("No Order found for this design");
    }

    await validatePaymentForDesign(order._id.toString(), session);

    const allowedStatuses = [
      OrderStatus.OrderReceived,
      OrderStatus.FilesUploaded,
      OrderStatus.InvoiceSent,
      OrderStatus.AwaitingPartPayment,
      OrderStatus.PartPaymentMade,
      OrderStatus.UnderReview,
      OrderStatus.FinalPaid,
      OrderStatus.DesignUploaded,
    ];

    if (!allowedStatuses.includes(order.status)) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(
        `Design cannot be uploaded when order is in ${order.status} status`,
      );
    }

    const existingApprovedDesign = await Design.findOne({
      orderId: order._id,
      productId: data.productId,
      isApproved: true
    }).session(session);

    if (existingApprovedDesign) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`Product already has an approved design. Cannot upload new design.`);
    }

    const lastDesign = await Design.findOne({ 
      orderId: order._id,
      productId: data.productId 
    }).session(session).sort({ version: -1 });
    
    const newVersion = lastDesign ? lastDesign.version + 1 : 1;

    if (!data.designUrl) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("A design file must be uploaded.");
    }

    const [design] = await Design.create(
      [{
        userId: order.userId,
        orderId: order._id,
        productId: data.productId,
        uploadedBy: data.uploadedBy,
        version: newVersion,
        isApproved: false,
        designUrl: data.designUrl,
        otherImage: data.otherImage,
        createdAt: new Date(),
      }],
      { session },
    );

    const hasDesigns = await hasAnyDesigns(order._id.toString(), session);
    if (!hasDesigns) {
      order.status = OrderStatus.DesignUploaded;
      await order.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    const user = await User.findById(order.userId).exec();
    if (!user) {
      throw new Error("User not found");
    }
    
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile) {
      throw new Error("Profile not found");
    }

    const productInOrder = order.items.find(
      (item) => item.productId.toString() === data.productId.toString(),
    );

    if (!productInOrder) {
      throw new Error("The selected product is not part of this order.");
    }

    const productName = productInOrder.productName;

    io.to("superadmin-room").emit("designUploaded", {
      designId: design._id,
      orderId: design.orderId,
      orderNumber: order.orderNumber,
      designUrl: design.designUrl,
      uploadedBy: design.uploadedBy,
      productName,
      version: design.version,
    });

    io.to("admin-room").emit("designUploaded", {
      designId: design._id,
      orderId: design.orderId,
      orderNumber: order.orderNumber,
      designUrl: design.designUrl,
      productName,
      version: design.version,
    });

    io.to(`user-${order.userId}`).emit("design-uploaded", {
      designId: design._id,
      orderId: design.orderId,
      orderNumber: order.orderNumber,
      productId: design.productId,
      productName,
      version: design.version,
      designUrl: design.designUrl,
      message: `Design for ${productName} is ready for review`,
    });

    // await emailService
    //   .sendDesignReady(
    //     user.email,
    //     profile.firstName,
    //     order.orderNumber,
    //     productName,
    //     `${process.env.FRONTEND_URL}/orders/${order.orderNumber}/design`,
    //   )
    //   .catch((err) => console.error("Error sending design ready email:", err));

    try {
      await notificationService.createForUser(user._id, {
        type: 'design-uploaded',
        title: 'Design Ready for Review',
        message: `A new design for ${productName} (order #${order.orderNumber}) is ready for your review`,
        data: {
          designId: design._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: design.productId,
          productName,
          version: design.version,
          designUrl: design.designUrl,
          uploadedBy: design.uploadedBy
        },
        link: `/orders/${order._id}/products/${design.productId}/design`
      });

      await notificationService.createForAdmins({
        type: 'admin-design-uploaded',
        title: 'Design Uploaded',
        message: `Design for ${productName} (order #${order.orderNumber}) was uploaded`,
        data: {
          designId: design._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: design.productId,
          productName,
          version: design.version,
          customerId: user._id,
          customerName: `${profile.firstName} ${profile.lastName}`,
          uploadedBy: design.uploadedBy
        },
        link: `/dashboards/admin/orders/${order._id}/designs/${design._id}`
      });
      
    } catch (notifErr: any) {
      console.error('Failed to create design upload notifications:', notifErr.message);
    }

    return design;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const updateDesign = async (
  id: string,
  data: Partial<IDesign>,
  io: Server,
): Promise<IDesign> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!data.productId) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("productId is required for design upload.");
    }

    const updatedDesign = await Design.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true, session },
    );

    if (!updatedDesign) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Design not found");
    }

    await session.commitTransaction();
    session.endSession();

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

    await emailService
      .sendDesignReady(
        user.email,
        profile.firstName,
        orderNumber,
        productName,
        `${process.env.FRONTEND_URL}/orders/${orderNumber}/design`,
      )
      .catch((err) => console.error("Error sending design update email:", err));

    io.to("superadmin-room").emit("designUpdated", {
      designId: updatedDesign._id,
      orderId: updatedDesign.orderId,
      orderNumber: orderNumber,
      designUrl: updatedDesign.designUrl,
      uploadedBy: updatedDesign.uploadedBy,
      productName,
      version: updatedDesign.version,
    });

    io.to("admin-room").emit("designUpdated", {
      designId: updatedDesign._id,
      orderId: updatedDesign.orderId,
      orderNumber: orderNumber,
      productName,
      version: updatedDesign.version,
    });

    io.to(`user-${user._id}`).emit("design-updated", {
      designId: updatedDesign._id,
      orderId: updatedDesign.orderId,
      orderNumber: orderNumber,
      productId: updatedDesign.productId,
      productName,
      version: updatedDesign.version,
      designUrl: updatedDesign.designUrl,
      message: `Design for ${productName} has been updated`,
    });

    try {
      await notificationService.createForUser(user._id, {
        type: 'design-updated',
        title: 'Design Updated',
        message: `The design for ${productName} (order #${orderNumber}) has been updated`,
        data: {
          designId: updatedDesign._id,
          orderId: order._id,
          orderNumber,
          productId: updatedDesign.productId,
          productName,
          version: updatedDesign.version,
          designUrl: updatedDesign.designUrl,
          updatedBy: updatedDesign.uploadedBy
        },
        link: `/orders/${order._id}/products/${updatedDesign.productId}/design`
      });

      await notificationService.createForAdmins({
        type: 'admin-design-updated',
        title: 'Design Updated',
        message: `Design for ${productName} (order #${orderNumber}) was updated`,
        data: {
          designId: updatedDesign._id,
          orderId: order._id,
          orderNumber,
          productId: updatedDesign.productId,
          productName,
          version: updatedDesign.version,
          customerId: user._id,
          updatedBy: updatedDesign.uploadedBy
        },
        link: `/dashboards/admin/orders/${order._id}/designs/${updatedDesign._id}`
      });
      
    } catch (notifErr: any) {
      console.error('Failed to create design update notifications:', notifErr.message);
    }

    return updatedDesign;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const deleteDesign = async (id: string): Promise<string> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const design = await Design.findById(id).session(session);
    if (!design) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Design not found");
    }

    const order = await Order.findById(design.orderId).session(session);
    const user = await User.findById(design.userId);
    const product = await Product.findById(design.productId);

    const filesToDelete = [design.designUrl, ...(design.otherImage || [])].filter(Boolean);

    for (const fileUrl of filesToDelete) {
      if (fileUrl) {
        const filename = path.basename(fileUrl);
        const filePath = path.join("uploads", filename);
        try {
          await fs.unlink(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (err) {
          console.error(`Failed to delete file ${filePath}:`, err);
        }
      }
    }

    await Design.findByIdAndDelete(id).session(session);

    if (order) {
      const hasDesigns = await hasAnyDesigns(order._id.toString(), session);
      if (!hasDesigns) {
        order.status = OrderStatus.PartPaymentMade;
        await order.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    if (user && order) {
      try {
        await notificationService.createForUser(user._id, {
          type: 'design-deleted',
          title: 'Design Deleted',
          message: `A design for order #${order.orderNumber} has been deleted`,
          data: {
            designId: design._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            productId: design.productId,
            productName: product?.name
          },
          link: `/orders/${order._id}`
        });

        await notificationService.createForAdmins({
          type: 'admin-design-deleted',
          title: 'Design Deleted',
          message: `Design for order #${order.orderNumber} was deleted`,
          data: {
            designId: design._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            productId: design.productId,
            productName: product?.name,
            customerId: user._id
          },
          link: `/dashboards/admin/orders/${order._id}`
        });
        
      } catch (notifErr: any) {
        console.error('Failed to create design deletion notifications:', notifErr.message);
      }
    }

    return "Design deleted successfully";
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const approveDesign = async (id: string): Promise<IDesign> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const design = await Design.findById(id).session(session);
    if (!design) {
      await session.abortTransaction();
      session.endSession();
      throw new Error("Design not found");
    }

    design.isApproved = true;
    design.approvedAt = new Date();
    await design.save({ session });

    const allProductsApproved = await areAllProductsApproved(design.orderId.toString(), session);

    const order = await Order.findById(design.orderId).session(session).exec();
    if (order && allProductsApproved) {
      order.status = OrderStatus.Approved;
      await order.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    if (order) {
      const io = (global as any).io;
      if (io) {
        io.to(`user-${order.userId}`).emit("design-approved", {
          designId: design._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: design.productId,
          allProductsApproved
        });

        io.to("admin-room").emit("design-approved", {
          designId: design._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: design.productId,
          allProductsApproved
        });

        io.to("superadmin-room").emit("design-approved", {
          designId: design._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: design.productId,
          allProductsApproved
        });
      }
    }

    const user = await User.findById(design.userId).exec();
    const profile = await Profile.findOne({ userId: design.userId }).exec();
    const product = await Product.findById(design.productId).exec();

    if (user && profile && order && product) {
    //   await emailService
    //     .sendDesignApproved(
    //       user.email,
    //       profile.firstName,
    //       order.orderNumber,
    //       product.name,
    //       "3-5", 
    //     )
    //     .catch((err) =>
    //       console.error("Error sending design approved email:", err),
    //     );

      try {
        await notificationService.createForUser(user._id, {
          type: 'design-approved',
          title: allProductsApproved ? 'All Designs Approved' : 'Design Approved',
          message: allProductsApproved 
            ? `All designs for order #${order.orderNumber} have been approved! Production will begin shortly.`
            : `Your design for ${product.name} (order #${order.orderNumber}) has been approved!`,
          data: {
            designId: design._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            productId: design.productId,
            productName: product.name,
            version: design.version,
            approvedAt: design.approvedAt,
            allProductsApproved
          },
          link: `/orders/${order._id}`
        });

        await notificationService.createForAdmins({
          type: 'admin-design-approved',
          title: allProductsApproved ? 'All Designs Approved' : 'Design Approved',
          message: allProductsApproved
            ? `All designs for order #${order.orderNumber} have been approved by customer`
            : `Design for ${product.name} (order #${order.orderNumber}) was approved by customer`,
          data: {
            designId: design._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            productId: design.productId,
            productName: product.name,
            customerId: user._id,
            allProductsApproved
          },
          link: `/dashboards/admin/orders/${order._id}/designs/${design._id}`
        });
        
      } catch (notifErr: any) {
        console.error('Failed to create design approval notifications:', notifErr.message);
      }
    }

    return design;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getDesignById = async (id: string): Promise<IDesign> => {
  const design = await Design.findById(id)
    .populate("userId", "email")
    .populate("orderId")
    .populate("productId")
    .populate("uploadedBy", "email");
  
  if (!design) throw new Error("Design not found");

  return design;
};

export const getUserDesigns = async (userId: string): Promise<IDesign[]> => {
  const designs = await Design.find({ userId })
    .populate("orderId")
    .populate("productId")
    .sort({ createdAt: -1 })
    .exec();

  return designs;
};

export const getDesignsByOrderId = async (
  orderId: string,
): Promise<IDesign[]> => {
  const designs = await Design.find({ orderId })
    .populate("productId")
    .sort({ version: -1 })
    .exec();

  return designs;
};

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

export const getDesignByProductId = async (
  productId: string,
): Promise<IDesign[]> => {
  const designs = await Design.find({ productId })
    .populate("orderId")
    .sort({ version: -1 })
    .exec();

  return designs;
};

export const getAllDesigns = async (): Promise<IDesign[]> => {
  return Design.find()
    .populate("userId")
    .populate("orderId")
    .populate("productId")
    .populate("uploadedBy")
    .sort({ createdAt: -1 })
    .exec();
};