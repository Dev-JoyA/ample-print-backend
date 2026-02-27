import {
  Transaction,
  ITransaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from "../model/transactionModel.js";
import {
  Order,
  PaymentStatus,
  OrderStatus,
} from "../../order/model/orderModel.js";
import { Invoice, InvoiceStatus } from "../../invoice/model/invoiceModel.js";
import { User, UserRole } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { Server } from "socket.io";
import emailService from "../../utils/email.js";
import { Types } from "mongoose";
import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API = "https://api.paystack.co";

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate unique transaction reference
 */
const generateTransactionReference = (): string => {
  return `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

/**
 * Get all super admin emails
 */
const getSuperAdminEmails = async (): Promise<string[]> => {
  const superAdmins = await User.find({
    role: UserRole.SuperAdmin,
    isActive: true,
  }).select("email");
  return superAdmins.map((admin) => admin.email);
};

/**
 * Update order and invoice after successful payment
 */
const updateOrderAndInvoiceAfterPayment = async (
  orderId: string,
  invoiceId: string,
  amount: number,
  transactionType: TransactionType,
  transactionId: string,
): Promise<void> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  // Update order payment fields
  order.amountPaid = (order.amountPaid || 0) + amount;
  order.remainingBalance = order.totalAmount - order.amountPaid;

  // Update payment status based on transaction type and amount
  if (order.remainingBalance <= 0) {
    order.paymentStatus = PaymentStatus.Completed;
    // Don't auto-update order status - let super admin decide next step
    // But if it was part payment and now fully paid, we might want to update
    if (
      order.status === OrderStatus.AwaitingPartPayment ||
      order.status === OrderStatus.PartPaymentMade
    ) {
      order.status = OrderStatus.InvoiceSent; // Or whatever makes sense
    }
  } else if (transactionType === TransactionType.Part) {
    order.paymentStatus = PaymentStatus.PartPayment;
    order.status = OrderStatus.PartPaymentMade;
  }

  // Link invoice to order if not already linked
  if (!order.invoiceId) {
    order.invoiceId = new Types.ObjectId(invoiceId);
  }

  await order.save();

  // Update invoice
  invoice.transactions = invoice.transactions || [];
  invoice.transactions.push(new Types.ObjectId(transactionId));
  invoice.amountPaid = (invoice.amountPaid || 0) + amount;
  invoice.remainingAmount = invoice.totalAmount - invoice.amountPaid;

  if (invoice.remainingAmount <= 0) {
    invoice.status = InvoiceStatus.Paid;
    invoice.paidAt = new Date();
  } else if (invoice.amountPaid > 0) {
    invoice.status = InvoiceStatus.PartiallyPaid;
  }

  await invoice.save();
};

// ==================== PAYSTACK PAYMENT ====================

/**
 * Initialize Paystack payment
 */
export const initializePaystackPayment = async (
  orderId: string,
  invoiceId: string,
  amount: number,
  email: string,
  transactionType: TransactionType,
): Promise<{
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}> => {
  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Check if amount matches expected
    if (
      transactionType === TransactionType.Final &&
      amount !== invoice.totalAmount
    ) {
      throw new Error(`Final payment must be exactly ${invoice.totalAmount}`);
    }

    if (
      transactionType === TransactionType.Part &&
      amount !== invoice.depositAmount
    ) {
      throw new Error(
        `Deposit payment must be exactly ${invoice.depositAmount}`,
      );
    }

    // Generate unique reference
    const reference = generateTransactionReference();

    // Create transaction record (pending)
    const transaction = await Transaction.create({
      orderId: new Types.ObjectId(orderId),
      orderNumber: order.orderNumber,
      invoiceId: new Types.ObjectId(invoiceId),
      transactionId: reference,
      transactionAmount: amount,
      transactionStatus: TransactionStatus.Pending,
      transactionType: transactionType,
      paymentMethod: PaymentMethod.Paystack,
      metadata: {
        initializedAt: new Date(),
      },
    });

    // Call Paystack API to initialize payment
    const response = await axios.post(
      `${PAYSTACK_API}/transaction/initialize`,
      {
        email,
        amount: amount * 100, // Paystack uses kobo (multiply by 100)
        reference,
        metadata: {
          orderId,
          invoiceId,
          transactionId: transaction._id.toString(),
          transactionType,
        },
        callback_url: `${process.env.FRONTEND_URL}/payment/verify`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.data.status) {
      throw new Error(
        response.data.message || "Paystack initialization failed",
      );
    }

    return {
      authorizationUrl: response.data.data.authorization_url,
      accessCode: response.data.data.access_code,
      reference,
    };
  } catch (error: any) {
    console.error("Paystack initialization error:", error);
    throw new Error(`Payment initialization failed: ${error.message}`);
  }
};

/**
 * Verify Paystack payment
 */
export const verifyPaystackPayment = async (
  reference: string,
  io: Server,
): Promise<ITransaction> => {
  try {
    // Find transaction
    const transaction = await Transaction.findOne({ transactionId: reference });
    if (!transaction) throw new Error("Transaction not found");

    if (transaction.transactionStatus !== TransactionStatus.Pending) {
      throw new Error("Transaction already processed");
    }

    // Verify with Paystack
    const response = await axios.get(
      `${PAYSTACK_API}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    if (!response.data.status) {
      throw new Error(response.data.message || "Payment verification failed");
    }

    const paystackData = response.data.data;

    // Update transaction
    transaction.transactionStatus =
      paystackData.status === "success"
        ? TransactionStatus.Completed
        : TransactionStatus.Failed;
    transaction.metadata = {
      ...transaction.metadata,
      paystackResponse: paystackData,
      verifiedAt: new Date(),
    };
    transaction.paidAt =
      paystackData.status === "success" ? new Date() : undefined;

    await transaction.save();

    // If payment successful, update order and invoice
    if (transaction.transactionStatus === TransactionStatus.Completed) {
      await updateOrderAndInvoiceAfterPayment(
        transaction.orderId.toString(),
        transaction.invoiceId!.toString(),
        transaction.transactionAmount,
        transaction.transactionType,
        transaction._id.toString(),
      );

      // Get order and user details for notifications
      const order = await Order.findById(transaction.orderId);
      const user = await User.findById(order?.userId);
      const profile = await Profile.findOne({ userId: user?._id });

      if (user && profile && order) {
        // ✅ SEND CUSTOMER SOCKET NOTIFICATION
        io.to(`user-${user._id}`).emit("payment-verified", {
          transactionId: transaction._id,
          orderId: transaction.orderId,
          orderNumber: transaction.orderNumber,
          amount: transaction.transactionAmount,
          type: transaction.transactionType,
          paymentMethod: "paystack",
          status: "success",
          message:
            transaction.transactionType === TransactionType.Part
              ? "Your deposit payment has been verified successfully"
              : "Your payment has been verified successfully",
          timestamp: new Date(),
        });

        // Send email to customer
        if (transaction.transactionType === TransactionType.Part) {
          await emailService
            .sendDesignReady(
              user.email,
              profile.firstName,
              order.orderNumber,
              "Payment",
              `${process.env.FRONTEND_URL}/orders/${order.orderNumber}`,
            )
            .catch((err) => console.error("Error sending payment email:", err));
        } else {
          await emailService
            .sendOrderDelivered(
              user.email,
              profile.firstName,
              order.orderNumber,
            )
            .catch((err) => console.error("Error sending payment email:", err));
        }
      }

      // ✅ NOTIFY SUPER ADMINS
      const superAdminEmails = await getSuperAdminEmails();
      for (const adminEmail of superAdminEmails) {
        await emailService
          .sendAdminNewOrder(
            adminEmail,
            order!.orderNumber,
            profile?.firstName || "Customer",
            user?.email || "customer@example.com",
            transaction.transactionAmount,
            order?.items || [],
          )
          .catch((err) => console.error("Error notifying super admin:", err));
      }

      // ✅ SOCKET NOTIFICATIONS FOR ADMINS
      io.to("admin-room").emit("payment-received", {
        transactionId: transaction._id,
        orderId: transaction.orderId,
        orderNumber: transaction.orderNumber,
        amount: transaction.transactionAmount,
        type: transaction.transactionType,
        paymentMethod: "paystack",
        customerName: profile?.firstName || "Customer",
        timestamp: new Date(),
      });

      io.to("superadmin-room").emit("payment-received", {
        transactionId: transaction._id,
        orderId: transaction.orderId,
        orderNumber: transaction.orderNumber,
        amount: transaction.transactionAmount,
        type: transaction.transactionType,
        paymentMethod: "paystack",
        customerName: profile?.firstName || "Customer",
        timestamp: new Date(),
      });
    }

    return transaction;
  } catch (error: any) {
    console.error("Paystack verification error:", error);
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};

// ==================== BANK TRANSFER PAYMENT ====================

/**
 * Upload receipt for bank transfer
 */
export const uploadBankTransferReceipt = async (
  orderId: string,
  invoiceId: string,
  amount: number,
  userId: string,
  receiptUrl: string,
  transactionType: TransactionType,
  io: Server,
): Promise<ITransaction> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Verify user owns this order
  if (order.userId.toString() !== userId) {
    throw new Error("Unauthorized");
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  // Check if amount matches expected
  if (
    transactionType === TransactionType.Final &&
    amount !== invoice.totalAmount
  ) {
    throw new Error(`Final payment must be exactly ${invoice.totalAmount}`);
  }

  if (
    transactionType === TransactionType.Part &&
    amount !== invoice.depositAmount
  ) {
    throw new Error(`Deposit payment must be exactly ${invoice.depositAmount}`);
  }

  // Check if there's already a pending transaction for this invoice
  const existingPending = await Transaction.findOne({
    invoiceId,
    transactionStatus: TransactionStatus.Pending,
    paymentMethod: PaymentMethod.BankTransfer,
  });

  if (existingPending) {
    throw new Error(
      "You already have a pending bank transfer verification for this invoice",
    );
  }

  // Generate reference
  const reference = generateTransactionReference();

  // Create transaction
  const transaction = await Transaction.create({
    orderId: new Types.ObjectId(orderId),
    orderNumber: order.orderNumber,
    invoiceId: new Types.ObjectId(invoiceId),
    transactionId: reference,
    transactionAmount: amount,
    transactionStatus: TransactionStatus.Pending,
    transactionType,
    paymentMethod: PaymentMethod.BankTransfer,
    receiptUrl,
    metadata: {
      uploadedBy: userId,
      uploadedAt: new Date(),
    },
  });

  // Get user profile for notifications
  const profile = await Profile.findOne({ userId });

  // ✅ NOTIFY CUSTOMER THAT RECEIPT WAS UPLOADED
  io.to(`user-${userId}`).emit("receipt-uploaded", {
    transactionId: transaction._id,
    orderId: transaction.orderId,
    orderNumber: transaction.orderNumber,
    amount: transaction.transactionAmount,
    type: transaction.transactionType,
    message: "Your receipt has been uploaded and is pending verification",
    timestamp: new Date(),
  });

  // ✅ NOTIFY SUPER ADMINS
  const superAdmins = await User.find({
    role: UserRole.SuperAdmin,
    isActive: true,
  });
  for (const admin of superAdmins) {
    // Socket notification
    io.to("superadmin-room").emit("pending-bank-transfer", {
      transactionId: transaction._id,
      orderId: transaction.orderId,
      orderNumber: transaction.orderNumber,
      amount: transaction.transactionAmount,
      type: transaction.transactionType,
      customerName: profile?.firstName || "Customer",
      receiptUrl,
      timestamp: new Date(),
    });

    // Email notification
    await emailService
      .sendAdminNewOrder(
        admin.email,
        order.orderNumber,
        profile?.firstName || "Customer",
        (await User.findById(userId))?.email || "",
        transaction.transactionAmount,
        order.items,
      )
      .catch((err) => console.error("Error notifying super admin:", err));
  }

  return transaction;
};

/**
 * Verify bank transfer (Super Admin only)
 */
export const verifyBankTransfer = async (
  transactionId: string,
  superAdminId: string,
  status: "approve" | "reject",
  notes?: string,
  io?: Server,
): Promise<ITransaction> => {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw new Error("Transaction not found");

  if (transaction.paymentMethod !== PaymentMethod.BankTransfer) {
    throw new Error("This is not a bank transfer transaction");
  }

  if (transaction.transactionStatus !== TransactionStatus.Pending) {
    throw new Error("Transaction already processed");
  }

  // Update transaction
  transaction.transactionStatus =
    status === "approve"
      ? TransactionStatus.Completed
      : TransactionStatus.Failed;
  transaction.verifiedBy = new Types.ObjectId(superAdminId);
  transaction.verifiedAt = new Date();
  transaction.metadata = {
    ...transaction.metadata,
    verificationNotes: notes,
    verifiedAt: new Date(),
  };

  if (status === "approve") {
    transaction.paidAt = new Date();
  }

  await transaction.save();

  // Get order and user details
  const order = await Order.findById(transaction.orderId);
  const user = await User.findById(order?.userId);
  const profile = await Profile.findOne({ userId: user?._id });
  const superAdmin = await User.findById(superAdminId);

  if (status === "approve") {
    await updateOrderAndInvoiceAfterPayment(
      transaction.orderId.toString(),
      transaction.invoiceId!.toString(),
      transaction.transactionAmount,
      transaction.transactionType,
      transaction._id.toString(),
    );

    if (user && profile && order && io) {
      // ✅ NOTIFY CUSTOMER (SOCKET)
      io.to(`user-${user._id}`).emit("payment-verified", {
        transactionId: transaction._id,
        orderId: transaction.orderId,
        orderNumber: transaction.orderNumber,
        amount: transaction.transactionAmount,
        type: transaction.transactionType,
        paymentMethod: "bank_transfer",
        status: "approved",
        message:
          transaction.transactionType === TransactionType.Part
            ? "Your deposit payment has been verified successfully"
            : "Your payment has been verified successfully",
        timestamp: new Date(),
      });

      // Email to customer
      if (transaction.transactionType === TransactionType.Part) {
        await emailService
          .sendDesignReady(
            user.email,
            profile.firstName,
            order.orderNumber,
            "Payment",
            `${process.env.FRONTEND_URL}/orders/${order.orderNumber}`,
          )
          .catch((err) => console.error("Error sending payment email:", err));
      } else {
        await emailService
          .sendOrderDelivered(user.email, profile.firstName, order.orderNumber)
          .catch((err) => console.error("Error sending payment email:", err));
      }
    }
  } else {
    // Payment rejected
    if (user && profile && order && io) {
      // ✅ NOTIFY CUSTOMER (SOCKET)
      io.to(`user-${user._id}`).emit("payment-rejected", {
        transactionId: transaction._id,
        orderId: transaction.orderId,
        orderNumber: transaction.orderNumber,
        amount: transaction.transactionAmount,
        reason: notes || "Receipt could not be verified",
        timestamp: new Date(),
      });

      // Email to customer about rejection
      await emailService
        .sendOrderConfirmation(
          user.email,
          profile.firstName,
          order.orderNumber,
          order.items,
          order.totalAmount,
        )
        .catch((err) => console.error("Error sending rejection email:", err));
    }
  }

  // ✅ NOTIFY OTHER SUPER ADMINS
  if (io) {
    const superAdmins = await User.find({
      role: UserRole.SuperAdmin,
      isActive: true,
    });
    for (const admin of superAdmins) {
      if (admin._id.toString() !== superAdminId) {
        io.to("superadmin-room").emit("bank-transfer-verified", {
          transactionId: transaction._id,
          orderId: transaction.orderId,
          orderNumber: transaction.orderNumber,
          amount: transaction.transactionAmount,
          status,
          verifiedBy: superAdmin?.email || "Unknown",
          timestamp: new Date(),
        });
      }
    }

    // Notify admin room
    io.to("admin-room").emit("bank-transfer-verified", {
      transactionId: transaction._id,
      orderId: transaction.orderId,
      orderNumber: transaction.orderNumber,
      status,
      timestamp: new Date(),
    });
  }

  return transaction;
};

// ==================== TRANSACTION QUERIES ====================

/**
 * Get pending bank transfers (Super Admin)
 */
export const getPendingBankTransfers = async (
  page: number = 1,
  limit: number = 10,
): Promise<{
  transactions: ITransaction[];
  total: number;
  page: number;
  pages: number;
}> => {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({
      paymentMethod: PaymentMethod.BankTransfer,
      transactionStatus: TransactionStatus.Pending,
    })
      .populate("orderId", "orderNumber userId totalAmount")
      .populate("invoiceId")
      .populate("verifiedBy", "email")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Transaction.countDocuments({
      paymentMethod: PaymentMethod.BankTransfer,
      transactionStatus: TransactionStatus.Pending,
    }),
  ]);

  return {
    transactions,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Get transactions by order
 */
export const getTransactionsByOrder = async (
  orderId: string,
  userRole: string,
  userId: string,
): Promise<ITransaction[]> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Check authorization
  if (userRole === UserRole.Customer && order.userId.toString() !== userId) {
    throw new Error("Unauthorized");
  }

  return Transaction.find({ orderId })
    .populate("verifiedBy", "email")
    .sort({ createdAt: -1 })
    .exec();
};

/**
 * Get transactions by invoice
 */
export const getTransactionsByInvoice = async (
  invoiceId: string,
): Promise<ITransaction[]> => {
  return Transaction.find({ invoiceId })
    .populate("verifiedBy", "email")
    .sort({ createdAt: -1 })
    .exec();
};

/**
 * Get user's transactions
 */
export const getUserTransactions = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
): Promise<{
  transactions: ITransaction[];
  total: number;
  page: number;
  pages: number;
}> => {
  // Find user's orders first
  const orders = await Order.find({ userId }).select("_id orderNumber");
  const orderIds = orders.map((o) => o._id);

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find({ orderId: { $in: orderIds } })
      .populate("orderId", "orderNumber totalAmount")
      .populate("invoiceId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Transaction.countDocuments({ orderId: { $in: orderIds } }),
  ]);

  return {
    transactions,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};
