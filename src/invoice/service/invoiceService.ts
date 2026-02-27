import {
  IInvoice,
  Invoice,
  InvoiceStatus,
  InvoiceType,
} from "../model/invoiceModel.js";
import {
  Order,
  OrderStatus,
  PaymentStatus,
} from "../../order/model/orderModel.js";
import { User, UserRole } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import emailService from "../../utils/email.js";
import { Server } from "socket.io";
import mongoose from "mongoose"; // ✅ Import mongoose, not Types

export interface InvoiceFilter {
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  userId?: string;
  orderId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedInvoices {
  invoices: IInvoice[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ==================== CREATE INVOICE (Super Admin only) ====================
export const createInvoice = async (
  orderId: string,
  data: {
    paymentType: "full" | "part";
    depositAmount?: number;
    discount?: number;
    dueDate: Date;
    notes?: string;
    paymentInstructions?: string;
  },
  superAdminId: string,
  io: Server,
): Promise<IInvoice> => {
  const session = await mongoose.startSession(); // ✅ FIXED
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error("Order not found for creating invoice");
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({
      orderId: order._id,
    }).session(session);
    if (existingInvoice) {
      throw new Error("Invoice already exists for this order");
    }

    // Calculate amounts
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    const discount = data.discount || 0;
    const totalAmount = subtotal - discount;

    let depositAmount = 0;
    let remainingAmount = totalAmount;

    if (data.paymentType === "part") {
      depositAmount = data.depositAmount || totalAmount * 0.3; // Default 30% if not specified
      remainingAmount = totalAmount - depositAmount;
    }

    // Create invoice
    const [invoice] = await Invoice.create(
      [
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceType: InvoiceType.Main,
          items: order.items.map((item) => ({
            description: item.productName,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.quantity * item.price,
          })),
          subtotal,
          discount,
          totalAmount,
          depositAmount,
          partPaymentAmount: 0,
          remainingAmount,
          amountPaid: 0,
          status: InvoiceStatus.Draft,
          issueDate: new Date(),
          dueDate: data.dueDate,
          notes: data.notes,
          paymentInstructions:
            data.paymentInstructions || "Bank transfer to GTBank 0123456789",
          transactions: [],
        },
      ],
      { session },
    );

    // ✅ UPDATE ORDER WITH INVOICE DETAILS
    order.invoiceId = invoice._id;
    order.requiredPaymentType = data.paymentType;
    if (data.paymentType === "part") {
      order.requiredDeposit = depositAmount;
    }
    order.status = OrderStatus.InvoiceSent;
    await order.save({ session });

    await session.commitTransaction();

    // Get user details for notifications
    const user = await User.findById(order.userId);
    const profile = await Profile.findOne({ userId: order.userId });

    // ✅ SOCKET NOTIFICATIONS
    io.to("admin-room").emit("new-invoice", {
      invoiceId: invoice._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
    });

    io.to("superadmin-room").emit("invoice-created", {
      invoiceId: invoice._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      createdBy: superAdminId,
    });

    // ✅ EMAIL NOTIFICATION TO CUSTOMER
    if (user && profile) {
      const dueDateStr = data.dueDate.toLocaleDateString();

      await emailService
        .sendInvoiceReady(
          user.email,
          profile.firstName,
          order.orderNumber,
          invoice.invoiceNumber,
          invoice.totalAmount,
          depositAmount || undefined,
          dueDateStr,
        )
        .catch((err) => console.error("Error sending invoice email:", err));

      // Also send socket notification to customer
      io.to(`user-${user._id}`).emit("invoice-created", {
        invoiceId: invoice._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: invoice.totalAmount,
        dueDate: data.dueDate,
      });
    }

    return invoice;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ==================== CREATE SHIPPING INVOICE (Admin only) ====================
export const createShippingInvoice = async (
  orderId: string,
  shippingId: string,
  data: {
    shippingCost: number;
    dueDate: Date;
    notes?: string;
  },
  adminId: string,
  io: Server,
): Promise<IInvoice> => {
  const session = await mongoose.startSession(); // ✅ FIXED
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error("Order not found");
    }

    // Create shipping invoice
    const [invoice] = await Invoice.create(
      [
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceType: InvoiceType.Shipping,
          items: [
            {
              description: "Shipping & Handling",
              quantity: 1,
              unitPrice: data.shippingCost,
              total: data.shippingCost,
            },
          ],
          subtotal: data.shippingCost,
          discount: 0,
          totalAmount: data.shippingCost,
          depositAmount: 0,
          partPaymentAmount: 0,
          remainingAmount: data.shippingCost,
          amountPaid: 0,
          status: InvoiceStatus.Draft,
          issueDate: new Date(),
          dueDate: data.dueDate,
          notes: data.notes,
          paymentInstructions: "Shipping payment - Bank transfer",
          shippingId: new mongoose.Types.ObjectId(shippingId),
          transactions: [],
        },
      ],
      { session },
    );

    // ✅ UPDATE ORDER WITH SHIPPING INVOICE LINK
    order.shippingId = new mongoose.Types.ObjectId(shippingId);
    await order.save({ session });

    await session.commitTransaction();

    // Get user details for notifications
    const user = await User.findById(order.userId);
    const profile = await Profile.findOne({ userId: order.userId });

    // ✅ NOTIFICATIONS
    io.to("admin-room").emit("new-shipping-invoice", {
      invoiceId: invoice._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: data.shippingCost,
    });

    if (user && profile) {
      const dueDateStr = data.dueDate.toLocaleDateString();

      await emailService
        .sendInvoiceReady(
          user.email,
          profile.firstName,
          order.orderNumber,
          invoice.invoiceNumber,
          data.shippingCost,
          undefined,
          dueDateStr,
        )
        .catch((err) =>
          console.error("Error sending shipping invoice email:", err),
        );

      io.to(`user-${user._id}`).emit("shipping-invoice-created", {
        invoiceId: invoice._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: data.shippingCost,
        dueDate: data.dueDate,
      });
    }

    return invoice;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ==================== UPDATE INVOICE ====================
export const updateInvoice = async (
  invoiceId: string,
  data: Partial<IInvoice>,
  userId: string,
  userRole: string,
  io: Server,
): Promise<IInvoice> => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Only allow updates to draft invoices
  if (invoice.status !== InvoiceStatus.Draft) {
    throw new Error("Cannot update invoice that has been sent or paid");
  }

  // Track what changed for notifications
  const oldTotal = invoice.totalAmount;
  const oldDeposit = invoice.depositAmount;

  // Update fields
  Object.assign(invoice, data);

  // Recalculate amounts if needed
  if (data.discount !== undefined || data.items) {
    // Recalculate subtotal if items changed
    if (data.items) {
      invoice.subtotal = invoice.items.reduce(
        (sum, item) => sum + item.total,
        0,
      );
    }

    invoice.totalAmount = invoice.subtotal - invoice.discount;

    // Recalculate remaining based on payment type
    if (invoice.invoiceType === InvoiceType.Main) {
      invoice.remainingAmount = invoice.totalAmount - invoice.amountPaid;
    }
  }

  await invoice.save();

  // Get order for notifications
  const order = await Order.findById(invoice.orderId);
  const user = await User.findById(order?.userId);
  const profile = await Profile.findOne({ userId: order?.userId });

  // ✅ NOTIFICATIONS
  if (user && profile) {
    // Notify customer if amount changed
    if (
      oldTotal !== invoice.totalAmount ||
      oldDeposit !== invoice.depositAmount
    ) {
      await emailService
        .sendInvoiceReady(
          user.email,
          profile.firstName,
          order!.orderNumber,
          invoice.invoiceNumber,
          invoice.totalAmount,
          invoice.depositAmount || undefined,
          invoice.dueDate.toLocaleDateString(),
        )
        .catch((err) =>
          console.error("Error sending invoice update email:", err),
        );
    }
  }

  io.to("admin-room").emit("invoice-updated", {
    invoiceId: invoice._id,
    orderId: invoice.orderId,
    orderNumber: order?.orderNumber,
    status: invoice.status,
  });

  if (user) {
    io.to(`user-${user._id}`).emit("invoice-updated", {
      invoiceId: invoice._id,
      orderId: invoice.orderId,
      orderNumber: order?.orderNumber,
      totalAmount: invoice.totalAmount,
    });
  }

  return invoice;
};

// ==================== DELETE INVOICE ====================
export const deleteInvoice = async (
  invoiceId: string,
  userRole: string,
  io: Server,
): Promise<{ message: string }> => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Only allow deletion of draft invoices
  if (invoice.status !== InvoiceStatus.Draft) {
    throw new Error("Cannot delete invoice that has been sent or paid");
  }

  const order = await Order.findById(invoice.orderId);

  await Invoice.findByIdAndDelete(invoiceId);

  // ✅ NOTIFICATIONS
  io.to("admin-room").emit("invoice-deleted", {
    invoiceId: invoice._id,
    orderId: invoice.orderId,
    orderNumber: order?.orderNumber,
  });

  if (order) {
    const user = await User.findById(order.userId);
    if (user) {
      io.to(`user-${user._id}`).emit("invoice-deleted", {
        invoiceId: invoice._id,
        orderId: invoice.orderId,
        orderNumber: order.orderNumber,
      });
    }
  }

  return { message: "Invoice deleted successfully" };
};

// ==================== SEND INVOICE TO CUSTOMER ====================
export const sendInvoiceToCustomer = async (
  invoiceId: string,
  userId: string,
  userRole: string,
  io: Server,
): Promise<IInvoice> => {
  const invoice = await Invoice.findById(invoiceId)
    .populate({
      path: "orderId",
      populate: { path: "userId" },
    })
    .exec();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status !== InvoiceStatus.Draft) {
    throw new Error("Invoice has already been sent");
  }

  const order = invoice.orderId as any;
  const user = await User.findById(order.userId);
  const profile = await Profile.findOne({ userId: order.userId });

  if (!user || !profile) {
    throw new Error("User or profile not found");
  }

  // Update invoice status
  invoice.status = InvoiceStatus.Sent;
  await invoice.save();

  // ✅ SEND EMAIL
  await emailService
    .sendInvoiceReady(
      user.email,
      profile.firstName,
      order.orderNumber,
      invoice.invoiceNumber,
      invoice.totalAmount,
      invoice.depositAmount || undefined,
      invoice.dueDate.toLocaleDateString(),
    )
    .catch((err) => console.error("Error sending invoice email:", err));

  // ✅ SOCKET NOTIFICATIONS
  io.to(`user-${user._id}`).emit("invoice-sent", {
    invoiceId: invoice._id,
    orderId: order._id,
    orderNumber: order.orderNumber,
    totalAmount: invoice.totalAmount,
    dueDate: invoice.dueDate,
  });

  io.to("admin-room").emit("invoice-sent", {
    invoiceId: invoice._id,
    orderId: order._id,
    orderNumber: order.orderNumber,
  });

  return invoice;
};

// ==================== GET ALL INVOICES (Admin) ====================
export const getAllInvoices = async (
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedInvoices> => {
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find()
      .populate({
        path: "orderId",
        populate: { path: "userId", select: "email fullname" },
      })
      .populate("transactions")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Invoice.countDocuments(),
  ]);

  return {
    invoices,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

// ==================== GET INVOICE BY ID ====================
export const getInvoiceById = async (
  invoiceId: string,
  userId: string,
  userRole: string,
): Promise<IInvoice | null> => {
  const invoice = await Invoice.findById(invoiceId)
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    })
    .populate("transactions")
    .exec();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const order = invoice.orderId as any;

  // Check authorization
  if (userRole === "Customer" && order.userId._id.toString() !== userId) {
    throw new Error("Unauthorized to view this invoice");
  }

  return invoice;
};

// ==================== GET INVOICE BY INVOICE NUMBER ====================
export const getInvoiceByNumber = async (
  invoiceNumber: string,
  userId: string,
  userRole: string,
): Promise<IInvoice | null> => {
  const invoice = await Invoice.findOne({ invoiceNumber })
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    })
    .populate("transactions")
    .exec();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const order = invoice.orderId as any;

  // Check authorization
  if (userRole === "Customer" && order.userId._id.toString() !== userId) {
    throw new Error("Unauthorized to view this invoice");
  }

  return invoice;
};

// ==================== GET INVOICE BY ORDER ID ====================
export const getInvoiceByOrderId = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<IInvoice | null> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  // Check authorization
  if (userRole === "Customer" && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this invoice");
  }

  const invoice = await Invoice.findOne({ orderId })
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    })
    .populate("transactions")
    .exec();

  return invoice;
};

// ==================== GET INVOICE BY ORDER NUMBER ====================
export const getInvoiceByOrderNumber = async (
  orderNumber: string,
  userId: string,
  userRole: string,
): Promise<IInvoice | null> => {
  const order = await Order.findOne({ orderNumber });
  if (!order) {
    throw new Error("Order not found");
  }

  // Check authorization
  if (userRole === "Customer" && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this invoice");
  }

  const invoice = await Invoice.findOne({ orderId: order._id })
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    })
    .populate("transactions")
    .exec();

  return invoice;
};

// ==================== GET USER INVOICES ====================
export const getUserInvoices = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedInvoices> => {
  // Find all orders by user
  const orders = await Order.find({ userId }).select("_id").exec();
  const orderIds = orders.map((o) => o._id);

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find({ orderId: { $in: orderIds } })
      .populate("orderId", "orderNumber status")
      .populate("transactions")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Invoice.countDocuments({ orderId: { $in: orderIds } }),
  ]);

  return {
    invoices,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

// ==================== FILTER INVOICES (Admin) ====================
export const filterInvoices = async (
  filters: InvoiceFilter,
): Promise<PaginatedInvoices> => {
  const {
    status,
    invoiceType,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    userId,
    orderId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const query: any = {};

  if (status) query.status = status;
  if (invoiceType) query.invoiceType = invoiceType;
  if (orderId) query.orderId = new mongoose.Types.ObjectId(orderId);

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  // Amount range filter
  if (minAmount !== undefined || maxAmount !== undefined) {
    query.totalAmount = {};
    if (minAmount !== undefined) query.totalAmount.$gte = minAmount;
    if (maxAmount !== undefined) query.totalAmount.$lte = maxAmount;
  }

  // If userId provided, filter by user's orders
  if (userId) {
    const orders = await Order.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select("_id")
      .exec();
    const orderIds = orders.map((o) => o._id);
    query.orderId = { $in: orderIds };
  }

  const skip = (page - 1) * limit;
  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate({
        path: "orderId",
        populate: { path: "userId", select: "email fullname" },
      })
      .populate("transactions")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec(),
    Invoice.countDocuments(query),
  ]);

  return {
    invoices,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

// ==================== UPDATE INVOICE PAYMENT STATUS (called by payment service) ====================
export const updateInvoicePayment = async (
  invoiceId: string,
  paymentAmount: number,
  transactionId: string,
  io: Server,
): Promise<IInvoice> => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Add transaction to invoice
  invoice.transactions = invoice.transactions || [];
  invoice.transactions.push(new mongoose.Types.ObjectId(transactionId));

  // Update payment amounts
  invoice.amountPaid = (invoice.amountPaid || 0) + paymentAmount;
  invoice.remainingAmount = invoice.totalAmount - invoice.amountPaid;

  // Update status based on payment
  if (invoice.remainingAmount <= 0) {
    invoice.status = InvoiceStatus.Paid;
    invoice.paidAt = new Date();
  } else if (invoice.amountPaid > 0) {
    invoice.status = InvoiceStatus.PartiallyPaid;
  }

  await invoice.save();

  // Get order for notifications
  const order = await Order.findById(invoice.orderId);
  const user = await User.findById(order?.userId);
  const profile = await Profile.findOne({ userId: order?.userId });

  // ✅ NOTIFICATIONS
  if (user && profile && order) {
    if (invoice.status === InvoiceStatus.Paid) {
      await emailService
        .sendOrderDelivered(user.email, profile.firstName, order.orderNumber)
        .catch((err) => console.error("Error sending payment email:", err));
    }

    io.to(`user-${user._id}`).emit("invoice-payment-updated", {
      invoiceId: invoice._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amountPaid: invoice.amountPaid,
      remainingAmount: invoice.remainingAmount,
      status: invoice.status,
    });
  }

  io.to("admin-room").emit("invoice-payment-updated", {
    invoiceId: invoice._id,
    orderId: invoice.orderId,
    orderNumber: order?.orderNumber,
    status: invoice.status,
    amountPaid: invoice.amountPaid,
  });

  return invoice;
};
