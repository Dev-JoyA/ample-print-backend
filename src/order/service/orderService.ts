import { User, UserRole } from "../../users/model/userModel.js";
import {
  OrderData,
  OrderStatus,
  Order,
  PaymentStatus,
  IOrderModel,
  PaginatedOrder,
} from "../model/orderModel.js";
import { Product } from "../../product/model/productModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { Server } from "socket.io";
import emailService from "../../utils/email.js"; // ✅ Updated import
import { Types } from "mongoose";

const validStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.OrderReceived, OrderStatus.Cancelled],
  [OrderStatus.OrderReceived]: [
    OrderStatus.FilesUploaded,
    OrderStatus.InvoiceSent,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.FilesUploaded]: [
    OrderStatus.DesignUploaded,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.InvoiceSent]: [
    OrderStatus.AwaitingDeposit,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.AwaitingDeposit]: [
    OrderStatus.DepositPaid,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.DepositPaid]: [
    OrderStatus.DesignUploaded,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.DesignUploaded]: [
    OrderStatus.UnderReview,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.UnderReview]: [
    OrderStatus.Approved,
    OrderStatus.AwaitingPartPayment,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.Approved]: [OrderStatus.InProduction, OrderStatus.Cancelled],
  [OrderStatus.AwaitingPartPayment]: [
    OrderStatus.PartPaymentMade,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.PartPaymentMade]: [
    OrderStatus.InProduction,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.InProduction]: [OrderStatus.Completed, OrderStatus.Cancelled],
  [OrderStatus.Completed]: [
    OrderStatus.AwaitingFinalPayment,
    OrderStatus.Shipped,
    OrderStatus.Delivered,
  ],
  [OrderStatus.AwaitingFinalPayment]: [
    OrderStatus.FinalPaid,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.FinalPaid]: [OrderStatus.Shipped, OrderStatus.Delivered],
  [OrderStatus.Shipped]: [OrderStatus.Delivered],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Delivered]: [],
};

export const createOrder = async (
  userId: string,
  data: OrderData,
  io: Server,
): Promise<IOrderModel> => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.role === UserRole.Admin) {
    throw new Error("Admin cannot create an order");
  }

  const items = data.items;
  if (!items || items.length === 0) {
    throw new Error("You must select at least one product to create an order");
  }

  const seenProductIds = new Set<string>();
  const orderItems = [];
  let totalAmount = 0;

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  for (const item of items) {
    const product = productMap.get(item.productId.toString());
    const productId = item.productId.toString();

    if (seenProductIds.has(productId)) {
      throw new Error("You cannot order the same product multiple times");
    }

    seenProductIds.add(productId);

    if (!product) {
      throw new Error(`Product not found`);
    }

    if (item.quantity < product.minOrder) {
      throw new Error(
        `${product.name} minimum order quantity is ${product.minOrder}`,
      );
    }

    orderItems.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
      productSnapshot: {
        name: product.name,
        description: product.description,
        dimension: product.dimension,
        minOrder: product.minOrder,
        material: product.material,
      },
    });

    totalAmount += product.price * item.quantity;
  }

  const order = await Order.create({
    userId: user._id,
    items: orderItems,
    totalAmount: totalAmount,
    amountPaid: 0,
    remainingBalance: totalAmount,
    isDepositPaid: false,
    status: OrderStatus.OrderReceived,
    paymentStatus: PaymentStatus.Pending,
    createdAt: new Date(),
  });

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  io.to("superadmin-room").emit("new-order", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    message: "New order requires invoice generation",
  });

  io.to("admin-room").emit("new-order", {
    orderId: order._id,
    orderNumber: order.orderNumber,
  });

  // ✅ UPDATED: Use emailService.sendOrderConfirmation
  await emailService.sendOrderConfirmation(
    user.email,
    profile.firstName,
    order.orderNumber,
    orderItems,
    totalAmount,
    true // Deposit required
  ).catch((err) =>
    console.error("Error sending order confirmation email", err),
  );

  return order;
};

export const superAdminCreateOrder = async (
  customerId: string,
  data: OrderData,
  superAdminId: string,
  io: Server,
): Promise<IOrderModel> => {
  const customer = await User.findById(customerId);
  if (!customer) throw new Error("Customer not found");

  const items = data.items;
  if (!items || items.length === 0) {
    throw new Error("You must select at least one product");
  }

  const seenProductIds = new Set<string>();
  const orderItems = [];
  let totalAmount = 0;

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  for (const item of items) {
    const product = productMap.get(item.productId.toString());
    const productId = item.productId.toString();

    if (seenProductIds.has(productId)) {
      throw new Error("Cannot order the same product multiple times");
    }

    seenProductIds.add(productId);

    if (!product) {
      throw new Error(`Product not found`);
    }

    if (item.quantity < product.minOrder) {
      throw new Error(
        `${product.name} minimum order quantity is ${product.minOrder}`,
      );
    }

    orderItems.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
    });

    totalAmount += product.price * item.quantity;
  }

  const order = await Order.create({
    userId: customer._id,
    items: orderItems,
    totalAmount: totalAmount,
    amountPaid: 0,
    remainingBalance: totalAmount,
    isDepositPaid: false,
    status: OrderStatus.OrderReceived,
    paymentStatus: PaymentStatus.Pending,
    createdBy: new Types.ObjectId(superAdminId),
    createdAt: new Date(),
  });

  const profile = await Profile.findOne({ userId: customer._id });
  if (profile) {
    // ✅ UPDATED: Use emailService.sendOrderConfirmation
    await emailService.sendOrderConfirmation(
      customer.email,
      profile.firstName,
      order.orderNumber,
      orderItems,
      totalAmount,
      true
    ).catch((err) => console.error("Error sending email", err));
  }

  io.to("admin-room").emit("new-order", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    message: "New order created by super admin",
  });

  return order;
};

export const updateOrder = async (
  orderId: string,
  data: Partial<IOrderModel>,
  userId: string,
  userRole: string,
): Promise<IOrderModel> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const isOwner = order.userId.toString() === userId;
  const isAdmin = userRole === UserRole.SuperAdmin;

  if (!isOwner && !isAdmin) {
    throw new Error("Unauthorized to update this order");
  }

  // Restrict what customers can update
  if (isOwner && !isAdmin) {
    const allowedFields = ["shippingAddress", "phoneNumber", "notes"];
    const updates = Object.keys(data);

    for (const field of updates) {
      if (!allowedFields.includes(field)) {
        throw new Error(`You cannot update the '${field}' field`);
      }
    }
  }

  const updatedOrder = await Order.findByIdAndUpdate(orderId, data, {
    new: true,
    runValidators: true,
  });

  if (!updatedOrder) throw new Error("Failed to update order");

  return updatedOrder;
};

export const deleteOrder = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<string> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Check authorization
  const isOwner = order.userId.toString() === userId;
  const isSuperAdmin = userRole === UserRole.SuperAdmin;

  if (!isOwner && !isSuperAdmin) {
    throw new Error(
      "Only the order owner or Super Admin can delete this order",
    );
  }

  if (
    order.status !== OrderStatus.Pending &&
    order.status !== OrderStatus.OrderReceived &&
    !isSuperAdmin
  ) {
    throw new Error("Cannot delete order once it's been processed");
  }

  await Order.findByIdAndDelete(orderId);
  return "Order deleted successfully";
};

export const getOrderById = async (
  id: string,
  userId: string,
  userRole: string,
): Promise<IOrderModel> => {
  const order = await Order.findById(id)
    .populate("userId", "email")
    .populate("items.productId", "name images dimensions")
    .exec();

  if (!order) throw new Error("Order not found");

  // Check authorization
  if (userRole === UserRole.Customer && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this order");
  }

  return order;
};

// ==================== GET USER ORDERS ====================
export const getUserOrders = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedOrder> => {
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ userId: userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("items.productId", "name images"),
    Order.countDocuments({ userId: userId }),
  ]);

  return {
    order: orders,
    total,
    page,
    limit,
  };
};

// ==================== UPDATE ORDER STATUS ====================
export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus,
  userId: string,
  userRole: string,
  io: Server,
): Promise<IOrderModel> => {
  // Only admins can update status
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized to update order status");
  }

  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Validate status transition
  const allowedTransitions = validStatusTransitions[order.status];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
  }

  order.status = newStatus;
  await order.save();

  // Handle status-specific actions
  if (newStatus === OrderStatus.Completed) {
    order.paymentStatus = PaymentStatus.Completed;
    await order.save();

    const user = await User.findById(order.userId);
    const profile = await Profile.findOne({ userId: order.userId });

    if (user && profile) {
      // ✅ UPDATED: Use emailService.sendOrderDelivered
      await emailService.sendOrderDelivered(
        user.email,
        profile.firstName,
        order.orderNumber
      ).catch((err) =>
        console.error("Error sending order completion email", err),
      );
    }
  }

  // Notify customer of status change
  io.to(`user-${order.userId}`).emit("order-status-updated", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: newStatus,
  });

  return order;
};

// ==================== GET ALL ORDERS (Admin) ====================
export const getAllOrders = async (
  userRole: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedOrder> => {
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find()
      .populate("userId", "email fullname")
      .populate("items.productId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Order.countDocuments(),
  ]);

  return {
    order: orders,
    total,
    page,
    limit,
  };
};

// ==================== SEARCH BY ORDER NUMBER ====================
export const searchByOrderNumber = async (
  orderNumber: string,
  userRole: string,
): Promise<IOrderModel> => {
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  const order = await Order.findOne({ orderNumber })
    .populate("userId", "email fullname")
    .populate("items.productId", "name");

  if (!order) throw new Error("Order not found");

  return order;
};

// ==================== FILTER ORDERS (Admin) ====================
export const filterOrders = async (
  filters: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    userId?: string;
    page?: number;
    limit?: number;
  },
  userRole: string,
): Promise<PaginatedOrder> => {
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  const query: any = {};

  if (filters.status) query.status = filters.status;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.userId) query.userId = filters.userId;

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate) query.createdAt.$lte = filters.endDate;
  }

  if (filters.minAmount || filters.maxAmount) {
    query.totalAmount = {};
    if (filters.minAmount) query.totalAmount.$gte = filters.minAmount;
    if (filters.maxAmount) query.totalAmount.$lte = filters.maxAmount;
  }

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("userId", "email fullname")
      .populate("items.productId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Order.countDocuments(query),
  ]);

  return {
    order: orders,
    total,
    page,
    limit,
  };
};

// ==================== GET ORDERS NEEDING INVOICE ====================
export const getOrdersNeedingInvoice = async (
  userRole: string,
): Promise<IOrderModel[]> => {
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  return Order.find({
    status: OrderStatus.OrderReceived,
  })
    .populate("userId", "email fullname")
    .populate("items.productId", "name price")
    .sort({ createdAt: 1 })
    .exec();
};

// ==================== UPDATE PAYMENT DETAILS ====================
export const updateOrderPayment = async (
  orderId: string,
  paymentData: {
    amountPaid: number;
    depositAmount?: number;
    paymentStatus: PaymentStatus;
    isDepositPaid?: boolean;
  },
): Promise<IOrderModel> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Update payment fields
  if (paymentData.depositAmount !== undefined) {
    order.deposit = paymentData.depositAmount;
  }

  order.amountPaid = paymentData.amountPaid;
  order.remainingBalance = order.totalAmount - paymentData.amountPaid;
  order.paymentStatus = paymentData.paymentStatus;

  if (paymentData.isDepositPaid !== undefined) {
    order.isDepositPaid = paymentData.isDepositPaid;
  }

  // If fully paid, update status
  if (order.remainingBalance <= 0) {
    order.paymentStatus = PaymentStatus.Completed;
    order.status = OrderStatus.Completed;
    
    // ✅ ADDED: Send notification for completed payment
    const user = await User.findById(order.userId);
    const profile = await Profile.findOne({ userId: order.userId });
    
    if (user && profile) {
      await emailService.sendOrderDelivered(
        user.email,
        profile.firstName,
        order.orderNumber
      ).catch(err => console.error("Error sending payment complete email:", err));
    }
  }

  await order.save();
  return order;
};