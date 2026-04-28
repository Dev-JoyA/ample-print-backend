import * as paymentService from "../service/paymentService.js";
import { TransactionType } from "../model/transactionModel.js";
const getIO = (req) => {
    return req.io || req.app.get("io");
};
export const initializePaystackPayment = async (req, res) => {
    try {
        const user = req.user;
        const { orderId, invoiceId, amount, transactionType } = req.body;
        console.log("🔍 User from token:", user);
        console.log("🔍 User email:", user.email);
        console.log("🔍 Request body:", {
            orderId,
            invoiceId,
            amount,
            amountType: typeof amount,
            transactionType,
        });
        if (!orderId || !invoiceId || !amount || !transactionType) {
            return res.status(400).json({
                success: false,
                message: "orderId, invoiceId, amount, and transactionType are required",
            });
        }
        if (!Object.values(TransactionType).includes(transactionType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction type. Must be 'final' or 'part'",
            });
        }
        const result = await paymentService.initializePaystackPayment(orderId, invoiceId, amount, user.email, transactionType);
        res.status(200).json({
            success: true,
            message: "Payment initialized successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("❌ Payment initialization error:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const verifyPaystackPayment = async (req, res) => {
    try {
        const io = getIO(req);
        const { reference } = req.query;
        if (!reference) {
            return res.status(400).json({
                success: false,
                message: "Payment reference is required",
            });
        }
        const transaction = await paymentService.verifyPaystackPayment(reference, io);
        res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            data: transaction,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const uploadBankTransferReceipt = async (req, res) => {
    try {
        const io = getIO(req);
        const user = req.user;
        const { orderId, invoiceId, amount, transactionType } = req.body;
        const file = req.file;
        if (!orderId || !invoiceId || !amount || !transactionType) {
            return res.status(400).json({
                success: false,
                message: "orderId, invoiceId, amount, and transactionType are required",
            });
        }
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "Receipt file is required",
            });
        }
        if (!Object.values(TransactionType).includes(transactionType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction type. Must be 'final' or 'part'",
            });
        }
        const receiptUrl = `/uploads/receipts/${file.filename}`;
        const transaction = await paymentService.uploadBankTransferReceipt(orderId, invoiceId, amount, user._id, receiptUrl, transactionType, io);
        res.status(201).json({
            success: true,
            message: "Receipt uploaded successfully. Pending verification.",
            data: transaction,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const verifyBankTransfer = async (req, res) => {
    try {
        const io = getIO(req);
        const superAdmin = req.user;
        const { transactionId } = req.params;
        const { status, notes } = req.body;
        if (!status || !["approve", "reject"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status is required and must be 'approve' or 'reject'",
            });
        }
        const transaction = await paymentService.verifyBankTransfer(transactionId, superAdmin._id, status, notes, io);
        res.status(200).json({
            success: true,
            message: `Bank transfer ${status === "approve" ? "approved" : "rejected"} successfully`,
            data: transaction,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getPendingBankTransfers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await paymentService.getPendingBankTransfers(page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getTransactionsByOrder = async (req, res) => {
    try {
        const user = req.user;
        const { orderId } = req.params;
        const transactions = await paymentService.getTransactionsByOrder(orderId, user.role, user._id);
        res.status(200).json({
            success: true,
            data: transactions,
            count: transactions.length,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getTransactionsByInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const transactions = await paymentService.getTransactionsByInvoice(invoiceId);
        res.status(200).json({
            success: true,
            data: transactions,
            count: transactions.length,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getUserTransactions = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (user.role !== "Customer") {
            return res.status(403).json({
                success: false,
                message: "Only customers can view their transactions",
            });
        }
        const result = await paymentService.getUserTransactions(user._id, page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=paymentController.js.map