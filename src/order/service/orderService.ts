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
import emailService from "../../utils/email.js";
import { Types } from "mongoose";

const validStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  // Initial states
  [OrderStatus.Pending]: [OrderStatus.OrderReceived, OrderStatus.Cancelled],

  // Order received - can go to files upload or invoice
  [OrderStatus.OrderReceived]: [
    OrderStatus.FilesUploaded,
    OrderStatus.InvoiceSent,
    OrderStatus.Cancelled,
  ],

  // Files uploaded - design process starts
  [OrderStatus.FilesUploaded]: [
    OrderStatus.DesignUploaded,
    OrderStatus.Cancelled,
  ],

  // Invoice sent - payment tracking begins
  [OrderStatus.InvoiceSent]: [
    OrderStatus.AwaitingPartPayment,
    OrderStatus.Cancelled,
  ],

  // Design uploaded - customer review
  [OrderStatus.DesignUploaded]: [
    OrderStatus.UnderReview,
    OrderStatus.Cancelled,
  ],

  // Under review - customer approving
  [OrderStatus.UnderReview]: [
    OrderStatus.Approved,
    OrderStatus.AwaitingPartPayment, // If they need to pay more
    OrderStatus.Cancelled,
  ],

  // Approved - ready for production
  [OrderStatus.Approved]: [
    OrderStatus.InProduction,
    OrderStatus.AwaitingPartPayment, // If part payment required
    OrderStatus.Cancelled,
  ],

  // Awaiting part payment - waiting for deposit
  [OrderStatus.AwaitingPartPayment]: [
    OrderStatus.PartPaymentMade,
    OrderStatus.Cancelled,
  ],

  // Part payment made - deposit received
  [OrderStatus.PartPaymentMade]: [
    OrderStatus.InProduction,
    OrderStatus.AwaitingFinalPayment,
    OrderStatus.Cancelled,
  ],

  // In production - being printed
  [OrderStatus.InProduction]: [OrderStatus.Completed, OrderStatus.Cancelled],

  // Completed - ready for next step
  [OrderStatus.Completed]: [
    OrderStatus.ReadyForShipping,
    OrderStatus.AwaitingFinalPayment,
    OrderStatus.Delivered,
  ],

  // Awaiting final payment - balance due
  [OrderStatus.AwaitingFinalPayment]: [
    OrderStatus.FinalPaid,
    OrderStatus.Cancelled,
  ],

  // Final paid - all payments complete
  [OrderStatus.FinalPaid]: [
    OrderStatus.ReadyForShipping,
    OrderStatus.Shipped,
    OrderStatus.Delivered,
  ],

  // Ready for shipping - admin can create shipping
  [OrderStatus.ReadyForShipping]: [OrderStatus.Shipped, OrderStatus.Delivered],

  // Shipped - on the way
  [OrderStatus.Shipped]: [OrderStatus.Delivered],

  // Cancelled - terminal state
  [OrderStatus.Cancelled]: [],

  // Delivered - terminal state
  [OrderStatus.Delivered]: [],
};

// ==================== CREATE ORDER (Customer) ====================
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
    status: OrderStatus.OrderReceived,
    paymentStatus: PaymentStatus.Pending,
    createdAt: new Date(),
  });

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  // Socket notifications
  io.to("superadmin-room").emit("new-order", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    message: "New order created - requires invoice",
  });

  io.to("admin-room").emit("new-order", {
    orderId: order._id,
    orderNumber: order.orderNumber,
  });

  // Email notification
  await emailService
    .sendOrderConfirmation(
      user.email,
      profile.firstName,
      order.orderNumber,
      orderItems,
      totalAmount,
    )
    .catch((err) =>
      console.error("Error sending order confirmation email", err),
    );

  return order;
};

// ==================== SUPER ADMIN CREATE ORDER ====================
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
    status: OrderStatus.OrderReceived,
    paymentStatus: PaymentStatus.Pending,
    createdBy: new Types.ObjectId(superAdminId),
    createdAt: new Date(),
  });

  const profile = await Profile.findOne({ userId: customer._id });
  if (profile) {
    await emailService
      .sendOrderConfirmation(
        customer.email,
        profile.firstName,
        order.orderNumber,
        orderItems,
        totalAmount,
      )
      .catch((err) => console.error("Error sending email", err));
  }

  io.to("admin-room").emit("new-order", {
    orderId: order._id,
    orderNumber: order.orderNumber,
    message: "New order created by super admin",
  });

  return order;
};

// ==================== UPDATE ORDER ====================
export const updateOrder = async (
  orderId: string,
  data: Partial<IOrderModel>,
  userId: string,
  userRole: string,
): Promise<IOrderModel> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const isOwner = order.userId.toString() === userId;
  const isAdmin =
    userRole === UserRole.SuperAdmin || userRole === UserRole.Admin;

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

// ==================== DELETE ORDER ====================
export const deleteOrder = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<string> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

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

// ==================== GET ORDER BY ID ====================
export const getOrderById = async (
  id: string,
  userId: string,
  userRole: string,
): Promise<IOrderModel> => {
  const order = await Order.findById(id)
    .populate("userId", "email")
    .populate("items.productId", "name images dimensions")
    .populate("invoiceId")
    .populate("shippingId")
    .exec();

  if (!order) throw new Error("Order not found");

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
      .populate("items.productId", "name images")
      .populate("invoiceId")
      .populate("shippingId"),
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
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized to update order status");
  }

  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const allowedTransitions = validStatusTransitions[order.status];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
  }

  order.status = newStatus;
  await order.save();

  // Handle status-specific notifications
  if (newStatus === OrderStatus.ReadyForShipping) {
    io.to("admin-room").emit("order-ready-for-shipping", {
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  }

  if (newStatus === OrderStatus.Delivered) {
    const user = await User.findById(order.userId);
    const profile = await Profile.findOne({ userId: order.userId });

    if (user && profile) {
      await emailService
        .sendOrderDelivered(user.email, profile.firstName, order.orderNumber)
        .catch((err) =>
          console.error("Error sending order delivered email", err),
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
      .populate("invoiceId")
      .populate("shippingId")
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
    .populate("items.productId", "name")
    .populate("invoiceId")
    .populate("shippingId");

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
    hasInvoice?: boolean;
    hasShipping?: boolean;
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

  if (filters.hasInvoice !== undefined) {
    if (filters.hasInvoice) {
      query.invoiceId = { $ne: null };
    } else {
      query.invoiceId = null;
    }
  }

  if (filters.hasShipping !== undefined) {
    if (filters.hasShipping) {
      query.shippingId = { $ne: null };
    } else {
      query.shippingId = null;
    }
  }

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
      .populate("invoiceId")
      .populate("shippingId")
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

// ==================== GET ORDERS READY FOR INVOICE ====================
export const getOrdersReadyForInvoice = async (
  userRole: string,
): Promise<IOrderModel[]> => {
  if (userRole !== UserRole.SuperAdmin) {
    throw new Error(
      "Unauthorized - Only super admin can view orders ready for invoice",
    );
  }

  return Order.find({
    status: OrderStatus.OrderReceived,
    invoiceId: { $exists: false },
  })
    .populate("userId", "email fullname")
    .populate("items.productId", "name price")
    .sort({ createdAt: 1 })
    .exec();
};

// ==================== GET PAID ORDERS ====================
export const getPaidOrders = async (
  userRole: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedOrder> => {
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({
      paymentStatus: PaymentStatus.Completed,
      invoiceId: { $ne: null },
    })
      .populate("userId", "email fullname")
      .populate("items.productId", "name")
      .populate("invoiceId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Order.countDocuments({
      paymentStatus: PaymentStatus.Completed,
      invoiceId: { $ne: null },
    }),
  ]);

  return {
    order: orders,
    total,
    page,
    limit,
  };
};

// ==================== GET PARTIALLY PAID ORDERS ====================
export const getPartiallyPaidOrders = async (
  userRole: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedOrder> => {
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({
      paymentStatus: PaymentStatus.PartPayment,
      invoiceId: { $ne: null },
    })
      .populate("userId", "email fullname")
      .populate("items.productId", "name")
      .populate("invoiceId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Order.countDocuments({
      paymentStatus: PaymentStatus.PartPayment,
      invoiceId: { $ne: null },
    }),
  ]);

  return {
    order: orders,
    total,
    page,
    limit,
  };
};

// ==================== GET PENDING PAYMENT ORDERS ====================
export const getPendingPaymentOrders = async (
  userRole: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedOrder> => {
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({
      paymentStatus: PaymentStatus.Pending,
      invoiceId: { $ne: null },
    })
      .populate("userId", "email fullname")
      .populate("items.productId", "name")
      .populate("invoiceId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Order.countDocuments({
      paymentStatus: PaymentStatus.Pending,
      invoiceId: { $ne: null },
    }),
  ]);

  return {
    order: orders,
    total,
    page,
    limit,
  };
};

// ==================== GET ORDERS READY FOR SHIPPING ====================
export const getOrdersReadyForShipping = async (
  userRole: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedOrder> => {
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({
      status: OrderStatus.ReadyForShipping,
      shippingId: { $exists: false },
    })
      .populate("userId", "email fullname")
      .populate("items.productId", "name")
      .populate("invoiceId")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Order.countDocuments({
      status: OrderStatus.ReadyForShipping,
      shippingId: { $exists: false },
    }),
  ]);

  return {
    order: orders,
    total,
    page,
    limit,
  };
};

// ==================== UPDATE PAYMENT AFTER TRANSACTION ====================
export const updateOrderPayment = async (
  orderId: string,
  paymentData: {
    amountPaid: number;
    paymentStatus: PaymentStatus;
    remainingBalance: number;
  },
): Promise<IOrderModel> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  order.amountPaid = paymentData.amountPaid;
  order.paymentStatus = paymentData.paymentStatus;
  order.remainingBalance = paymentData.remainingBalance;

  await order.save();
  return order;
};

// ==================== LINK INVOICE TO ORDER ====================
export const linkInvoiceToOrder = async (
  orderId: string,
  invoiceId: Types.ObjectId,
  paymentType: "full" | "part",
  depositAmount?: number,
): Promise<IOrderModel> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  order.invoiceId = invoiceId;
  order.requiredPaymentType = paymentType;
  if (depositAmount) {
    order.requiredDeposit = depositAmount;
  }
  order.status = OrderStatus.InvoiceSent;

  await order.save();
  return order;
};
