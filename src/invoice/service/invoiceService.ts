import { IInvoice, Invoice, InvoiceStatus } from "../model/invoiceModel.js";
import { Order, OrderStatus } from "../../order/model/orderModel.js";
import { User } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import emailService from "../../utils/email.js"; // ✅ Updated import
import { Types } from "mongoose";

export interface InvoiceFilter {
  status?: InvoiceStatus;
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

// ==================== CREATE INVOICE ====================
export const createInvoice = async (
  orderId: string,
  data: Partial<IInvoice>,
): Promise<IInvoice> => {
  const order = await Order.findById(orderId).exec();
  if (!order) {
    throw new Error("Order not found for creating invoice");
  }

  const existingInvoice = await Invoice.findOne({ orderId: order._id }).exec();
  if (existingInvoice) {
    throw new Error("Invoice already exists for this order");
  }

  // Calculate amounts
  const totalAmount = order.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  
  const depositAmount = data.depositAmount || totalAmount * 0.3; // Default 30% deposit
  const discount = data.discount || 0;
  const amountAfterDiscount = totalAmount - discount;
  const remainingAmount = amountAfterDiscount - depositAmount;

  const invoiceData = await Invoice.create({
    orderId: order._id,
    orderNumber: order.orderNumber,
    items: order.items.map((item) => ({
      description: item.productName,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.quantity * item.price,
    })),
    totalAmount,
    depositAmount,
    partPaymentAmount: 0,
    remainingAmount,
    discount,
    status: InvoiceStatus.Draft,
    createdAt: new Date(),
  });

  order.status = OrderStatus.InvoiceSent;
  await order.save();

  const user = await User.findById(order.userId).exec();
  if (!user) throw new Error("User not found");

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) throw new Error("Profile not found");

  // Format due date (7 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const formattedDueDate = dueDate.toLocaleDateString();

  // ✅ UPDATED: Use emailService.sendInvoiceReady
  await emailService.sendInvoiceReady(
    user.email,
    profile.firstName,
    order.orderNumber,
    invoiceData._id.toString(), // Invoice number
    totalAmount,
    depositAmount,
    formattedDueDate
  ).catch((err) =>
    console.error("Error sending invoice email:", err),
  );

  return invoiceData;
};

// ==================== UPDATE INVOICE ====================
// export const updateInvoice = async (
//   invoiceId: string,
//   data: Partial<IInvoice>,
// ): Promise<IInvoice> => {
//   const invoice = await Invoice.findById(invoiceId);
//   if (!invoice) {
//     throw new Error("Invoice not found");
//   }

//   // Don't allow updates to sent or paid invoices
//   if (invoice.status !== InvoiceStatus.Draft) {
//     throw new Error("Cannot update invoice that has been sent or paid");
//   }

//   // Update fields
//   Object.assign(invoice, data);
  
//   // Recalculate remaining amount if total or deposit changed
//   if (data.totalAmount || data.depositAmount || data.discount !== undefined) {
//     const total = data.totalAmount || invoice.totalAmount;
//     const deposit = data.depositAmount || invoice.depositAmount;
//     const discount = data.discount !== undefined ? data.discount : invoice.discount;
//     const amountAfterDiscount = total - discount;
//     invoice.remainingAmount = amountAfterDiscount - deposit;
//   }

//   await invoice.save();
//   return invoice;
// };

// ==================== DELETE INVOICE ====================
export const deleteInvoice = async (
  invoiceId: string,
): Promise<{ message: string }> => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Only allow deletion of draft invoices
  if (invoice.status !== InvoiceStatus.Draft) {
    throw new Error("Cannot delete invoice that has been sent or paid");
  }

  await Invoice.findByIdAndDelete(invoiceId);
  return { message: "Invoice deleted successfully" };
};

// ==================== GET ALL INVOICES (Admin) ====================
export const getAllInvoice = async (
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedInvoices> => {
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find()
      .populate({
        path: "orderId",
        populate: { path: "userId", select: "email" }
      })
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
  if (userRole === "customer" && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this invoice");
  }

  const invoice = await Invoice.findOne({ orderId })
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" }
    })
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
  const orderIds = orders.map(o => o._id);

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find({ orderId: { $in: orderIds } })
      .populate("orderId", "orderNumber status")
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
  if (orderId) query.orderId = new Types.ObjectId(orderId);

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
    const orders = await Order.find({ userId: new Types.ObjectId(userId) })
      .select("_id")
      .exec();
    const orderIds = orders.map(o => o._id);
    query.orderId = { $in: orderIds };
  }

  const skip = (page - 1) * limit;
  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate({
        path: "orderId",
        populate: { path: "userId", select: "email fullname" }
      })
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

// ==================== SEND INVOICE TO CUSTOMER ====================
export const sendInvoiceToCustomer = async (
  invoiceId: string,
): Promise<IInvoice> => {
  const invoice = await Invoice.findById(invoiceId)
    .populate({
      path: "orderId",
      populate: { path: "userId" }
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

  // Format due date (7 days from invoice date)
  const dueDate = new Date(invoice.createdAt);
  dueDate.setDate(dueDate.getDate() + 7);
  const formattedDueDate = dueDate.toLocaleDateString();

  // Send email
  await emailService.sendInvoiceReady(
    user.email,
    profile.firstName,
    order.orderNumber,
    invoice._id.toString(),
    invoice.totalAmount,
    invoice.depositAmount,
    formattedDueDate
  ).catch(err => console.error("Error sending invoice email:", err));

  return invoice;
};

// ==================== MARK INVOICE AS PAID ====================
// export const markInvoiceAsPaid = async (
//   invoiceId: string,
//   paymentAmount: number,
//   paymentMethod: string,
// ): Promise<IInvoice> => {
//   const invoice = await Invoice.findById(invoiceId);
//   if (!invoice) {
//     throw new Error("Invoice not found");
//   }

//   // Update payment status based on amount
//   const totalPaid = (invoice.partPaymentAmount || 0) + paymentAmount;
  
//   if (totalPaid >= invoice.totalAmount) {
//     invoice.status = InvoiceStatus.Paid;
//     invoice.remainingAmount = 0;
//   } else if (totalPaid >= invoice.depositAmount) {
//     invoice.status = InvoiceStatus.PartiallyPaid;
//     invoice.remainingAmount = invoice.totalAmount - totalPaid;
//   } else {
//     invoice.status = InvoiceStatus.PartiallyPaid;
//     invoice.remainingAmount = invoice.totalAmount - totalPaid;
//   }

//   invoice.partPaymentAmount = totalPaid;
//   invoice.paidAt = new Date();
//   await invoice.save();

//   return invoice;
// };