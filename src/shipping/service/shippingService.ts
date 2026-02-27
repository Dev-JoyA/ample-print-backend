import {
  Shipping,
  IShipping,
  ShippingMethod,
  ShippingStatus,
} from "../model/shippingModel.js";
import { Order, OrderStatus } from "../../order/model/orderModel.js";
import { User } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { Server } from "socket.io";
import emailService from "../../utils/email.js";
import mongoose from "mongoose";

export interface IShippingFilter {
  status?: ShippingStatus;
  method?: ShippingMethod;
  orderId?: string;
  userId?: string;
  isPaid?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedShipping {
  shipping: IShipping[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  country?: string;
  postalCode?: string;
}

export interface CreateShippingData {
  shippingMethod: ShippingMethod;
  shippingCost: number;

  // For delivery - customer provides address only
  // Name and phone come from profile (cannot be changed)
  address?: ShippingAddress; // Required for delivery

  // For pickup
  pickupNotes?: string;
}

// ==================== CREATE SHIPPING (Admin only) ====================
export const createShipping = async (
  orderId: string,
  data: CreateShippingData,
  adminId: string,
  io: Server,
): Promise<IShipping> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error("Order not found");
    }

    // Check if order is ready for shipping
    if (
      order.status !== OrderStatus.ReadyForShipping &&
      order.status !== OrderStatus.Completed
    ) {
      throw new Error(
        `Order must be in ReadyForShipping or Completed status to create shipping. Current status: ${order.status}`,
      );
    }

    // Check if shipping already exists
    const existingShipping = await Shipping.findOne({ orderId }).session(
      session,
    );
    if (existingShipping) {
      throw new Error("Shipping record already exists for this order");
    }

    // Validate based on shipping method
    if (data.shippingMethod === ShippingMethod.Delivery && !data.address) {
      throw new Error("Address is required for delivery");
    }

    // Get user profile for name and phone (these cannot be changed by customer)
    const profile = await Profile.findOne({ userId: order.userId });
    if (!profile) {
      throw new Error("User profile not found");
    }

    // Create shipping record
    const [shipping] = await Shipping.create(
      [
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          shippingMethod: data.shippingMethod,
          shippingCost: data.shippingCost,
          status: ShippingStatus.Pending,
          isPaid: false,

          // For delivery - use profile name/phone, customer-provided address
          ...(data.shippingMethod === ShippingMethod.Delivery && {
            recipientName: `${profile.firstName} ${profile.lastName}`,
            recipientPhone: profile.phoneNumber,
            address: {
              ...data.address,
              country: data.address?.country || "Nigeria",
            },
          }),

          // Metadata
          metadata: {
            createdBy: adminId,
            pickupNotes: data.pickupNotes,
          },
        },
      ],
      { session },
    );

    // Update order with shipping ID
    order.shippingId = shipping._id;
    await order.save({ session });

    await session.commitTransaction();

    // Get user for notifications
    const user = await User.findById(order.userId);

    // ✅ NOTIFICATIONS
    if (data.shippingMethod === ShippingMethod.Delivery) {
      io.to(`user-${order.userId}`).emit("shipping-created", {
        shippingId: shipping._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        method: "delivery",
        cost: data.shippingCost,
        address: data.address,
        recipientName: `${profile.firstName} ${profile.lastName}`,
        recipientPhone: profile.phoneNumber,
      });

      // Email to customer about shipping setup
      if (user && profile) {
        const addressStr = data.address
          ? `${data.address.street}, ${data.address.city}, ${data.address.state}`
          : "To be determined";

        await emailService
          .sendOrderShipped(
            user.email,
            profile.firstName,
            order.orderNumber,
            "Pending",
            "N/A",
            "To be determined",
            addressStr,
            `${process.env.FRONTEND_URL}/orders/${order.orderNumber}`,
          )
          .catch((err) => console.error("Error sending shipping email:", err));
      }
    } else {
      // Pickup notification
      io.to(`user-${order.userId}`).emit("pickup-ready", {
        shippingId: shipping._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Your order is ready for pickup at our store",
        storeAddress: process.env.STORE_ADDRESS || "123 Main Street, Lagos",
        storeHours: process.env.STORE_HOURS || "Mon-Fri 9am-5pm",
      });
    }

    io.to("admin-room").emit("shipping-created", {
      shippingId: shipping._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      method: data.shippingMethod,
    });

    return shipping;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ==================== UPDATE SHIPPING TRACKING (Admin only) ====================
export const updateShippingTracking = async (
  shippingId: string,
  data: {
    trackingNumber: string;
    carrier?: string;
    estimatedDelivery?: Date;
  },
  adminId: string,
  io: Server,
): Promise<IShipping> => {
  const shipping = await Shipping.findById(shippingId);
  if (!shipping) {
    throw new Error("Shipping not found");
  }

  if (shipping.shippingMethod !== ShippingMethod.Delivery) {
    throw new Error("Cannot add tracking number for pickup orders");
  }

  if (shipping.status !== ShippingStatus.Pending) {
    throw new Error(`Cannot update tracking when status is ${shipping.status}`);
  }

  // Update tracking
  shipping.trackingNumber = data.trackingNumber;

  // Add to tracking history
  shipping.trackingHistory = shipping.trackingHistory || [];
  shipping.trackingHistory.push({
    status: ShippingStatus.Shipped,
    location: "Warehouse",
    description: `Package shipped via ${data.carrier || "courier"} with tracking ${data.trackingNumber}`,
    timestamp: new Date(),
  });

  // Update metadata
  shipping.metadata = {
    ...shipping.metadata,
    carrier: data.carrier,
    trackingUpdatedBy: adminId,
    trackingUpdatedAt: new Date(),
  };

  if (data.estimatedDelivery) {
    shipping.estimatedDelivery = data.estimatedDelivery;
  }

  // Update status to Shipped when tracking is added
  shipping.status = ShippingStatus.Shipped;

  await shipping.save();

  // Get order and user for notifications
  const order = await Order.findById(shipping.orderId);
  const user = await User.findById(order?.userId);
  const profile = await Profile.findOne({ userId: order?.userId });

  // ✅ NOTIFICATIONS
  if (user && profile && order) {
    io.to(`user-${user._id}`).emit("tracking-updated", {
      shippingId: shipping._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      trackingNumber: data.trackingNumber,
      carrier: data.carrier,
      estimatedDelivery: data.estimatedDelivery,
      status: ShippingStatus.Shipped,
    });

    const addressStr = shipping.address
      ? `${shipping.address.street}, ${shipping.address.city}, ${shipping.address.state}`
      : "Your address";

    await emailService
      .sendOrderShipped(
        user.email,
        profile.firstName,
        order.orderNumber,
        data.carrier || "Courier",
        data.trackingNumber,
        data.estimatedDelivery?.toLocaleDateString() || "To be determined",
        addressStr,
        `${process.env.TRACKING_BASE_URL}/${data.trackingNumber}`,
      )
      .catch((err) => console.error("Error sending tracking email:", err));
  }

  io.to("admin-room").emit("tracking-updated", {
    shippingId: shipping._id,
    orderId: shipping.orderId,
    orderNumber: order?.orderNumber,
    trackingNumber: data.trackingNumber,
    status: ShippingStatus.Shipped,
  });

  return shipping;
};

// ==================== UPDATE SHIPPING STATUS (Admin only) ====================
export const updateShippingStatus = async (
  shippingId: string,
  status: ShippingStatus,
  adminId: string,
  io: Server,
): Promise<IShipping> => {
  const shipping = await Shipping.findById(shippingId);
  if (!shipping) {
    throw new Error("Shipping not found");
  }

  // Validate status transition
  const validTransitions: Record<ShippingStatus, ShippingStatus[]> = {
    [ShippingStatus.Pending]: [
      ShippingStatus.Shipped,
      ShippingStatus.Delivered,
    ],
    [ShippingStatus.Shipped]: [ShippingStatus.Delivered],
    [ShippingStatus.Delivered]: [],
  };

  if (!validTransitions[shipping.status].includes(status)) {
    throw new Error(`Cannot transition from ${shipping.status} to ${status}`);
  }

  const oldStatus = shipping.status;
  shipping.status = status;

  if (status === ShippingStatus.Delivered) {
    shipping.actualDelivery = new Date();
  }

  // Add to tracking history
  shipping.trackingHistory = shipping.trackingHistory || [];
  shipping.trackingHistory.push({
    status,
    location:
      status === ShippingStatus.Delivered ? "Destination" : "In transit",
    description: `Status changed from ${oldStatus} to ${status}`,
    timestamp: new Date(),
  });

  await shipping.save();

  // Get order and user for notifications
  const order = await Order.findById(shipping.orderId);
  const user = await User.findById(order?.userId);
  const profile = await Profile.findOne({ userId: order?.userId });

  // ✅ NOTIFICATIONS
  if (user && profile && order) {
    io.to(`user-${user._id}`).emit("shipping-status-updated", {
      shippingId: shipping._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      status,
      trackingNumber: shipping.trackingNumber,
    });

    if (status === ShippingStatus.Delivered) {
      await emailService
        .sendOrderDelivered(user.email, profile.firstName, order.orderNumber)
        .catch((err) => console.error("Error sending delivery email:", err));
    }
  }

  io.to("admin-room").emit("shipping-status-updated", {
    shippingId: shipping._id,
    orderId: shipping.orderId,
    orderNumber: order?.orderNumber,
    status,
  });

  return shipping;
};

// ==================== MARK SHIPPING AS PAID (called by payment service) ====================
export const markShippingAsPaid = async (
  shippingId: string,
  invoiceId: string,
): Promise<IShipping> => {
  const shipping = await Shipping.findById(shippingId);
  if (!shipping) {
    throw new Error("Shipping not found");
  }

  shipping.isPaid = true;
  shipping.shippingInvoiceId = new mongoose.Types.ObjectId(invoiceId);
  await shipping.save();

  return shipping;
};

// ==================== GET SHIPPING BY ID ====================
export const getShippingById = async (
  shippingId: string,
  userId: string,
  userRole: string,
): Promise<IShipping | null> => {
  const shipping = await Shipping.findById(shippingId).populate({
    path: "orderId",
    populate: {
      path: "userId",
      model: "User",
      populate: {
        path: "profileId",
        model: "Profile",
      },
    },
  });

  if (!shipping) {
    throw new Error("Shipping not found");
  }

  const order = shipping.orderId as any;

  // Check authorization
  if (userRole === "Customer" && order.userId._id.toString() !== userId) {
    throw new Error("Unauthorized to view this shipping");
  }

  return shipping;
};

// ==================== GET SHIPPING BY ORDER ID ====================
export const getShippingByOrderId = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<IShipping | null> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  // Check authorization
  if (userRole === "Customer" && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this shipping");
  }

  const shipping = await Shipping.findOne({ orderId }).populate({
    path: "orderId",
    populate: {
      path: "userId",
      model: "User",
      populate: {
        path: "profileId",
        model: "Profile",
      },
    },
  });

  return shipping;
};

// ==================== GET ALL SHIPPING (Admin) ====================
export const getAllShipping = async (
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedShipping> => {
  const skip = (page - 1) * limit;

  const [shipping, total] = await Promise.all([
    Shipping.find()
      .populate({
        path: "orderId",
        populate: {
          path: "userId",
          model: "User",
          populate: {
            path: "profileId",
            model: "Profile",
            select: "firstName lastName phoneNumber",
          },
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Shipping.countDocuments(),
  ]);

  return {
    shipping,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

// ==================== FILTER SHIPPING (Admin) ====================
export const filterShipping = async (
  filters: IShippingFilter,
): Promise<PaginatedShipping> => {
  const {
    status,
    method,
    orderId,
    userId,
    isPaid,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = filters;

  const query: any = {};

  if (status) query.status = status;
  if (method) query.shippingMethod = method;
  if (orderId) query.orderId = new mongoose.Types.ObjectId(orderId);
  if (isPaid !== undefined) query.isPaid = isPaid;

  // If userId provided, find orders by user first
  if (userId) {
    const orders = await Order.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).select("_id");
    const orderIds = orders.map((o) => o._id);
    query.orderId = { $in: orderIds };
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const skip = (page - 1) * limit;

  const [shipping, total] = await Promise.all([
    Shipping.find(query)
      .populate({
        path: "orderId",
        populate: {
          path: "userId",
          model: "User",
          populate: {
            path: "profileId",
            model: "Profile",
            select: "firstName lastName phoneNumber",
          },
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Shipping.countDocuments(query),
  ]);

  return {
    shipping,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

// ==================== GET SHIPPING NEEDING INVOICE (Admin) ====================
export const getShippingNeedingInvoice = async (): Promise<IShipping[]> => {
  return Shipping.find({
    shippingInvoiceId: { $exists: false },
    isPaid: false,
  })
    .populate("orderId", "orderNumber userId")
    .sort({ createdAt: 1 })
    .exec();
};

// ==================== GET PENDING SHIPPING (Admin) ====================
export const getPendingShipping = async (): Promise<IShipping[]> => {
  return Shipping.find({
    status: ShippingStatus.Pending,
  })
    .populate("orderId", "orderNumber userId")
    .sort({ createdAt: 1 })
    .exec();
};
