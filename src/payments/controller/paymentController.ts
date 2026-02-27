import { Request, Response } from "express";
import * as paymentService from "../service /paymentService.js";
import { TransactionType } from "../model/transactionModel.js";
import { Types } from "mongoose";

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

// ==================== PAYSTACK PAYMENTS ====================

/**
 * Initialize Paystack payment
 * POST /api/v1/payments/paystack/initialize
 */
export const initializePaystackPayment = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = req.user as { _id: string; email: string; role: string };
    const { orderId, invoiceId, amount, transactionType } = req.body;

    // Validate required fields
    if (!orderId || !invoiceId || !amount || !transactionType) {
      return res.status(400).json({
        success: false,
        message: "orderId, invoiceId, amount, and transactionType are required",
      });
    }

    // Validate transaction type
    if (!Object.values(TransactionType).includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type. Must be 'final' or 'part'",
      });
    }

    const result = await paymentService.initializePaystackPayment(
      orderId,
      invoiceId,
      amount,
      user.email,
      transactionType,
    );

    res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Verify Paystack payment
 * GET /api/v1/payments/paystack/verify?reference=REFERENCE
 */
export const verifyPaystackPayment = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required",
      });
    }

    const transaction = await paymentService.verifyPaystackPayment(
      reference as string,
      io,
    );

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== BANK TRANSFER PAYMENTS ====================

/**
 * Upload bank transfer receipt
 * POST /api/v1/payments/bank-transfer/upload-receipt
 */
export const uploadBankTransferReceipt = async (
  req: Request,
  res: Response,
) => {
  try {
    const io = getIO(req);
    const user = req.user as { _id: string; role: string };
    const { orderId, invoiceId, amount, transactionType } = req.body;
    const file = req.file;

    // Validate required fields
    if (!orderId || !invoiceId || !amount || !transactionType) {
      return res.status(400).json({
        success: false,
        message: "orderId, invoiceId, amount, and transactionType are required",
      });
    }

    // Validate file upload
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Receipt file is required",
      });
    }

    // Validate transaction type
    if (!Object.values(TransactionType).includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type. Must be 'final' or 'part'",
      });
    }

    const receiptUrl = `/uploads/receipts/${file.filename}`;

    const transaction = await paymentService.uploadBankTransferReceipt(
      orderId,
      invoiceId,
      amount,
      user._id,
      receiptUrl,
      transactionType,
      io,
    );

    res.status(201).json({
      success: true,
      message: "Receipt uploaded successfully. Pending verification.",
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Verify bank transfer (Super Admin only)
 * POST /api/v1/payments/bank-transfer/verify/:transactionId
 */
export const verifyBankTransfer = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const superAdmin = req.user as { _id: string; role: string };
    const { transactionId } = req.params;
    const { status, notes } = req.body;

    if (!status || !["approve", "reject"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status is required and must be 'approve' or 'reject'",
      });
    }

    const transaction = await paymentService.verifyBankTransfer(
      transactionId,
      superAdmin._id,
      status,
      notes,
      io,
    );

    res.status(200).json({
      success: true,
      message: `Bank transfer ${status === "approve" ? "approved" : "rejected"} successfully`,
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get pending bank transfers (Super Admin only)
 * GET /api/v1/payments/bank-transfer/pending?page=1&limit=10
 */
export const getPendingBankTransfers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await paymentService.getPendingBankTransfers(page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get transactions by order
 * GET /api/v1/payments/order/:orderId
 */
export const getTransactionsByOrder = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const { orderId } = req.params;

    const transactions = await paymentService.getTransactionsByOrder(
      orderId,
      user.role,
      user._id,
    );

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get transactions by invoice
 * GET /api/v1/payments/invoice/:invoiceId
 */
export const getTransactionsByInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const transactions =
      await paymentService.getTransactionsByInvoice(invoiceId);

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get user's transactions
 * GET /api/v1/payments/my-transactions?page=1&limit=10
 */
export const getUserTransactions = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Only customers can view their transactions
    if (user.role !== "Customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can view their transactions",
      });
    }

    const result = await paymentService.getUserTransactions(
      user._id,
      page,
      limit,
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
