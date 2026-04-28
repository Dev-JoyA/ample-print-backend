import mongoose, { Types } from "mongoose";
import { Transaction, TransactionStatus, TransactionType, PaymentMethod, } from "../model/transactionModel.js";
import { Order, PaymentStatus, OrderStatus, } from "../../order/model/orderModel.js";
import { Invoice, InvoiceStatus } from "../../invoice/model/invoiceModel.js";
import { User, UserRole } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import emailService from "../../utils/email.js";
import { notificationService } from "../../notification/service/notificationService.js";
import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API = "https://api.paystack.co";
const generateTransactionReference = () => {
    return `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};
// const getSuperAdminEmails = async (): Promise<string[]> => {
//   const superAdmins = await User.find({
//     role: UserRole.SuperAdmin,
//     isActive: true,
//   }).select("email");
//   return superAdmins.map((admin) => admin.email);
// };
const updateOrderAndInvoiceAfterPayment = async (orderId, invoiceId, amount, transactionType, transactionId, session) => {
    const order = await Order.findById(orderId).session(session || null);
    if (!order)
        throw new Error("Order not found");
    const invoice = await Invoice.findById(invoiceId).session(session || null);
    if (!invoice)
        throw new Error("Invoice not found");
    order.amountPaid = (order.amountPaid || 0) + amount;
    order.remainingBalance = order.totalAmount - order.amountPaid;
    if (order.remainingBalance <= 0) {
        order.paymentStatus = PaymentStatus.Completed;
        order.status = OrderStatus.FinalPaid;
    }
    else if (transactionType === TransactionType.Part) {
        order.paymentStatus = PaymentStatus.PartPayment;
        order.status = OrderStatus.PartPaymentMade;
    }
    if (!order.invoiceId) {
        order.invoiceId = new Types.ObjectId(invoiceId);
    }
    await order.save({ session });
    invoice.transactions = invoice.transactions || [];
    invoice.transactions.push(new Types.ObjectId(transactionId));
    invoice.amountPaid = (invoice.amountPaid || 0) + amount;
    invoice.remainingAmount = invoice.totalAmount - invoice.amountPaid;
    if (invoice.remainingAmount <= 0) {
        invoice.status = InvoiceStatus.Paid;
        invoice.paidAt = new Date();
    }
    else if (invoice.amountPaid > 0) {
        invoice.status = InvoiceStatus.PartiallyPaid;
    }
    await invoice.save({ session });
};
export const initializePaystackPayment = async (orderId, invoiceId, amount, email, transactionType) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findById(orderId).session(session);
        if (!order)
            throw new Error("Order not found");
        const invoice = await Invoice.findById(invoiceId).session(session);
        if (!invoice)
            throw new Error("Invoice not found");
        const amountPaid = invoice.amountPaid || 0;
        const remainingAmount = invoice.totalAmount - amountPaid;
        if (transactionType === TransactionType.Final) {
            if (Math.abs(amount - remainingAmount) > 0.01) {
                throw new Error(`Final payment must be exactly ${remainingAmount}. ` +
                    `(Total: ${invoice.totalAmount}, Already paid: ${amountPaid})`);
            }
        }
        else if (transactionType === TransactionType.Part) {
            if (amountPaid > 0) {
                throw new Error(`Deposit has already been paid (${amountPaid}). ` +
                    `You cannot make another deposit payment.`);
            }
            if (Math.abs(amount - invoice.depositAmount) > 0.01) {
                throw new Error(`Deposit payment must be exactly ${invoice.depositAmount}. ` +
                    `(Total: ${invoice.totalAmount})`);
            }
        }
        const reference = generateTransactionReference();
        const [transaction] = await Transaction.create([
            {
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
                    amountPaidBefore: amountPaid,
                    remainingAfterPayment: remainingAmount - amount,
                },
            },
        ], { session });
        await session.commitTransaction();
        session.endSession();
        const response = await axios.post(`${PAYSTACK_API}/transaction/initialize`, {
            email,
            amount: Math.round(amount * 100),
            reference,
            metadata: {
                orderId,
                invoiceId,
                transactionId: transaction._id.toString(),
                transactionType,
                amountPaidBefore: amountPaid,
                remainingAfterPayment: remainingAmount - amount,
            },
            callback_url: `${process.env.FRONTEND_URL}/payment/verify`,
        }, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });
        if (!response.data.status) {
            throw new Error(response.data.message || "Paystack initialization failed");
        }
        return {
            authorizationUrl: response.data.data.authorization_url,
            accessCode: response.data.data.access_code,
            reference,
        };
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Paystack initialization error:", error);
        throw new Error(`Payment initialization failed: ${error.message}`);
    }
};
export const verifyPaystackPayment = async (reference, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const transaction = await Transaction.findOne({
            transactionId: reference,
        }).session(session);
        if (!transaction)
            throw new Error("Transaction not found");
        if (transaction.transactionStatus !== TransactionStatus.Pending) {
            throw new Error("Transaction already processed");
        }
        const response = await axios.get(`${PAYSTACK_API}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        });
        if (!response.data.status) {
            throw new Error(response.data.message || "Payment verification failed");
        }
        const paystackData = response.data.data;
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
        await transaction.save({ session });
        const order = await Order.findById(transaction.orderId).session(session);
        const user = await User.findById(order?.userId);
        const profile = await Profile.findOne({ userId: user?._id });
        if (transaction.transactionStatus === TransactionStatus.Completed) {
            await updateOrderAndInvoiceAfterPayment(transaction.orderId.toString(), transaction.invoiceId.toString(), transaction.transactionAmount, transaction.transactionType, transaction._id.toString(), session);
            await session.commitTransaction();
            session.endSession();
            if (user && profile && order) {
                io.to(`user-${user._id}`).emit("payment-verified", {
                    transactionId: transaction._id,
                    orderId: transaction.orderId,
                    orderNumber: transaction.orderNumber,
                    amount: transaction.transactionAmount,
                    type: transaction.transactionType,
                    paymentMethod: "paystack",
                    status: "success",
                    message: transaction.transactionType === TransactionType.Part
                        ? "Your deposit payment has been verified successfully"
                        : "Your payment has been verified successfully",
                    timestamp: new Date(),
                });
                try {
                    let title = "Payment Successful";
                    let message = `Your payment of ₦${transaction.transactionAmount.toLocaleString()} for order #${transaction.orderNumber} was successful`;
                    if (transaction.transactionType === TransactionType.Part) {
                        title = "Deposit Payment Successful";
                        message = `Your deposit of ₦${transaction.transactionAmount.toLocaleString()} for order #${transaction.orderNumber} has been received`;
                    }
                    await notificationService.createForUser(user._id, {
                        type: "payment-successful",
                        title,
                        message,
                        data: {
                            transactionId: transaction.transactionId,
                            orderNumber: order.orderNumber,
                            invoiceId: transaction.invoiceId,
                            amount: transaction.transactionAmount,
                            transactionType: transaction.transactionType,
                            paymentMethod: "paystack",
                        },
                        link: `/orders/${order._id}`,
                    });
                }
                catch (notifErr) {
                    console.error("Failed to create payment notification:", notifErr);
                }
                await emailService
                    .sendPaymentConfirmation(user.email, profile.firstName, order.orderNumber, transaction.transactionAmount, transaction.transactionType === TransactionType.Part
                    ? "part"
                    : "full", "Paystack", order.remainingBalance)
                    .catch((err) => console.error("Error sending payment confirmation email:", err));
            }
            io.to("admin-room").emit("payment-received", {
                transactionId: transaction.transactionId,
                orderNumber: transaction.orderNumber,
                amount: transaction.transactionAmount,
                type: transaction.transactionType,
                paymentMethod: "paystack",
                customerName: profile?.firstName || "Customer",
                timestamp: new Date(),
            });
            io.to("superadmin-room").emit("payment-received", {
                transactionId: transaction.transactionId,
                orderNumber: transaction.orderNumber,
                amount: transaction.transactionAmount,
                type: transaction.transactionType,
                paymentMethod: "paystack",
                customerName: profile?.firstName || "Customer",
                timestamp: new Date(),
            });
            try {
                await notificationService.createForAdmins({
                    type: "payment-received",
                    title: "Payment Received",
                    message: `Payment of ₦${transaction.transactionAmount.toLocaleString()} received for order #${transaction.orderNumber}`,
                    data: {
                        transactionId: transaction.transactionId,
                        orderNumber: transaction.orderNumber,
                        amount: transaction.transactionAmount,
                        transactionType: transaction.transactionType,
                        paymentMethod: "paystack",
                        customerName: profile?.firstName || "Customer",
                        customerId: user?._id,
                    },
                    link: `/dashboards/admin/orders/${order._id}`,
                });
            }
            catch (notifErr) {
                console.error("Failed to create admin payment notification:", notifErr);
            }
        }
        else {
            await session.commitTransaction();
            session.endSession();
            if (user && order) {
                io.to(`user-${user._id}`).emit("payment-failed", {
                    transactionId: transaction.transactionId,
                    orderNumber: transaction.orderNumber,
                    amount: transaction.transactionAmount,
                    reason: paystackData.gateway_response || "Payment failed",
                    timestamp: new Date(),
                });
                try {
                    await notificationService.createForUser(user._id, {
                        type: "payment-failed",
                        title: "Payment Failed",
                        message: `Your payment of ₦${transaction.transactionAmount.toLocaleString()} for order #${transaction.orderNumber} failed. Please try again.`,
                        data: {
                            transactionId: transaction.transactionId,
                            orderNumber: order.orderNumber,
                            amount: transaction.transactionAmount,
                            reason: paystackData.gateway_response || "Unknown error",
                        },
                        link: `/orders/${order._id}`,
                    });
                }
                catch (notifErr) {
                    console.error("Failed to create payment failure notification:", notifErr);
                }
            }
        }
        return transaction;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Paystack verification error:", error);
        throw new Error(`Payment verification failed: ${error.message}`);
    }
};
export const uploadBankTransferReceipt = async (orderId, invoiceId, amount, userId, receiptUrl, transactionType, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findById(orderId).session(session);
        if (!order)
            throw new Error("Order not found");
        if (order.userId.toString() !== userId) {
            throw new Error("Unauthorized");
        }
        const invoice = await Invoice.findById(invoiceId).session(session);
        if (!invoice)
            throw new Error("Invoice not found");
        const amountPaid = invoice.amountPaid || 0;
        const remainingAmount = invoice.totalAmount - amountPaid;
        if (transactionType === TransactionType.Final) {
            if (Math.abs(amount - remainingAmount) > 0.01) {
                throw new Error(`Final payment must be exactly ${remainingAmount}. ` +
                    `(Total: ${invoice.totalAmount}, Already paid: ${amountPaid})`);
            }
        }
        else if (transactionType === TransactionType.Part) {
            if (amountPaid > 0) {
                throw new Error(`Deposit has already been paid (${amountPaid}). ` +
                    `You cannot make another deposit payment.`);
            }
            if (Math.abs(amount - invoice.depositAmount) > 0.01) {
                throw new Error(`Deposit payment must be exactly ${invoice.depositAmount}. ` +
                    `(Total: ${invoice.totalAmount})`);
            }
        }
        const existingPending = await Transaction.findOne({
            invoiceId,
            transactionStatus: TransactionStatus.Pending,
            paymentMethod: PaymentMethod.BankTransfer,
        }).session(session);
        if (existingPending) {
            throw new Error("You already have a pending bank transfer verification for this invoice. " +
                "Please wait for it to be verified before uploading another receipt.");
        }
        const reference = generateTransactionReference();
        const [transaction] = await Transaction.create([
            {
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
                    amountPaidBefore: amountPaid,
                    remainingAfterPayment: remainingAmount - amount,
                },
            },
        ], { session });
        await session.commitTransaction();
        session.endSession();
        const profile = await Profile.findOne({ userId });
        const user = await User.findById(userId);
        io.to(`user-${userId}`).emit("receipt-uploaded", {
            transactionId: transaction.transactionId,
            orderNumber: transaction.orderNumber,
            amount: transaction.transactionAmount,
            type: transaction.transactionType,
            message: "Your receipt has been uploaded and is pending verification",
            timestamp: new Date(),
        });
        try {
            await notificationService.createForUser(userId, {
                type: "receipt-uploaded",
                title: "Receipt Uploaded",
                message: `Your receipt for payment of ₦${amount.toLocaleString()} (order #${order.orderNumber}) has been uploaded and is pending verification`,
                data: {
                    transactionId: transaction.transactionId,
                    orderNumber: order.orderNumber,
                    invoiceId,
                    amount,
                    transactionType,
                    receiptUrl,
                },
                link: `/orders/${orderId}`,
            });
        }
        catch (notifErr) {
            console.error("Failed to create receipt upload notification:", notifErr);
        }
        if (user && profile) {
            await emailService
                .sendReceiptUploaded(user.email, profile.firstName, order.orderNumber, amount, transaction.transactionId.toString(), receiptUrl)
                .catch((err) => console.error("Error sending receipt uploaded email:", err));
        }
        const superAdmins = await User.find({
            role: UserRole.SuperAdmin,
            isActive: true,
        });
        for (const admin of superAdmins) {
            io.to("superadmin-room").emit("pending-bank-transfer", {
                transactionId: transaction.transactionId,
                orderNumber: transaction.orderNumber,
                amount: transaction.transactionAmount,
                type: transaction.transactionType,
                customerName: profile?.firstName || "Customer",
                receiptUrl,
                timestamp: new Date(),
            });
            try {
                await notificationService.createNotification(admin._id, {
                    type: "pending-bank-transfer",
                    title: "Pending Bank Transfer Verification",
                    message: `A bank transfer of ₦${amount.toLocaleString()} from ${profile?.firstName || "Customer"} for order #${order.orderNumber} requires verification`,
                    data: {
                        transactionId: transaction.transactionId,
                        orderNumber: order.orderNumber,
                        amount,
                        transactionType,
                        customerName: profile?.firstName || "Customer",
                        receiptUrl,
                        customerId: userId,
                    },
                    link: `/dashboards/super-admin/payment-verification/${transaction._id}`,
                });
            }
            catch (notifErr) {
                console.error("Failed to create admin pending transfer notification:", notifErr);
            }
        }
        return transaction;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Bank transfer upload error:", error);
        throw error;
    }
};
export const verifyBankTransfer = async (transactionId, superAdminId, status, notes, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const transaction = await Transaction.findById(transactionId).session(session);
        if (!transaction)
            throw new Error("Transaction not found");
        if (transaction.paymentMethod !== PaymentMethod.BankTransfer) {
            throw new Error("This is not a bank transfer transaction");
        }
        if (transaction.transactionStatus !== TransactionStatus.Pending) {
            throw new Error("Transaction already processed");
        }
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
        await transaction.save({ session });
        const order = await Order.findById(transaction.orderId).session(session);
        const user = await User.findById(order?.userId);
        const profile = await Profile.findOne({ userId: user?._id });
        const superAdmin = await User.findById(superAdminId);
        if (status === "approve" && io) {
            await updateOrderAndInvoiceAfterPayment(transaction.orderId.toString(), transaction.invoiceId.toString(), transaction.transactionAmount, transaction.transactionType, transaction._id.toString(), session);
            await session.commitTransaction();
            session.endSession();
            if (user && profile && order) {
                io.to(`user-${user._id}`).emit("payment-verified", {
                    transactionId: transaction.transactionId,
                    orderNumber: transaction.orderNumber,
                    amount: transaction.transactionAmount,
                    type: transaction.transactionType,
                    paymentMethod: "bank_transfer",
                    status: "approved",
                    message: transaction.transactionType === TransactionType.Part
                        ? "Your deposit payment has been verified successfully"
                        : "Your payment has been verified successfully",
                    timestamp: new Date(),
                });
                try {
                    const title = "Bank Transfer Approved";
                    const message = `Your bank transfer of ₦${transaction.transactionAmount.toLocaleString()} for order #${transaction.orderNumber} has been verified and approved`;
                    await notificationService.createForUser(user._id, {
                        type: "bank-transfer-approved",
                        title,
                        message,
                        data: {
                            transactionId: transaction.transactionId,
                            orderNumber: order.orderNumber,
                            invoiceId: transaction.invoiceId,
                            amount: transaction.transactionAmount,
                            transactionType: transaction.transactionType,
                            verifiedBy: superAdmin?.email,
                            verifiedAt: new Date(),
                        },
                        link: `/orders/${order._id}`,
                    });
                }
                catch (notifErr) {
                    console.error("Failed to create bank transfer approval notification:", notifErr);
                }
                await emailService
                    .sendPaymentVerified(user.email, profile.firstName, order.orderNumber, transaction.transactionAmount, transaction.transactionId.toString(), "approved")
                    .catch((err) => console.error("Error sending payment verified email:", err));
                await emailService
                    .sendPaymentConfirmation(user.email, profile.firstName, order.orderNumber, transaction.transactionAmount, transaction.transactionType === TransactionType.Part
                    ? "part"
                    : "full", "Bank Transfer", order.remainingBalance)
                    .catch((err) => console.error("Error sending payment confirmation email:", err));
                io.to("admin-room").emit("bank-transfer-approved", {
                    transactionId: transaction.transactionId,
                    orderNumber: transaction.orderNumber,
                    amount: transaction.transactionAmount,
                    customerName: profile.firstName,
                    verifiedBy: superAdmin?.email,
                    timestamp: new Date(),
                });
                await notificationService.createForSuperAdmins({
                    type: "bank-transfer-approved",
                    title: "Bank Transfer Approved",
                    message: `Bank transfer of ₦${transaction.transactionAmount.toLocaleString()} for order #${transaction.orderNumber} was approved by ${superAdmin?.email}`,
                    data: {
                        transactionId: transaction.transactionId,
                        orderNumber: order.orderNumber,
                        amount: transaction.transactionAmount,
                        verifiedBy: superAdminId,
                    },
                    link: `/dashboards/super-admin/payment-verification`,
                });
            }
        }
        else if (status === "reject" && io) {
            await session.commitTransaction();
            session.endSession();
            if (user && profile && order) {
                io.to(`user-${user._id}`).emit("payment-rejected", {
                    transactionId: transaction.transactionId,
                    orderNumber: transaction.orderNumber,
                    amount: transaction.transactionAmount,
                    reason: notes || "Receipt could not be verified",
                    timestamp: new Date(),
                });
                try {
                    await notificationService.createForUser(user._id, {
                        type: "bank-transfer-rejected",
                        title: "Bank Transfer Rejected",
                        message: `Your bank transfer of ₦${transaction.transactionAmount.toLocaleString()} for order #${transaction.orderNumber} was rejected. Reason: ${notes || "Receipt could not be verified"}`,
                        data: {
                            transactionId: transaction.transactionId,
                            orderNumber: order.orderNumber,
                            amount: transaction.transactionAmount,
                            reason: notes || "Receipt could not be verified",
                            verifiedBy: superAdmin?.email,
                        },
                        link: `/orders/${order._id}`,
                    });
                }
                catch (notifErr) {
                    console.error("Failed to create bank transfer rejection notification:", notifErr);
                }
                await emailService
                    .sendPaymentVerified(user.email, profile.firstName, order.orderNumber, transaction.transactionAmount, transaction.transactionId.toString(), "rejected", notes || "Receipt could not be verified")
                    .catch((err) => console.error("Error sending payment rejected email:", err));
                // await emailService
                //   .sendOrderCancelled(
                //     user.email,
                //     profile.firstName,
                //     order.orderNumber,
                //   )
                //   .catch((err) => console.error("Error sending rejection email:", err));
                await notificationService.createForSuperAdmins({
                    type: "bank-transfer-rejected",
                    title: "Bank Transfer Rejected",
                    message: `Bank transfer of ₦${transaction.transactionAmount.toLocaleString()} for order #${transaction.orderNumber} was rejected by ${superAdmin?.email}`,
                    data: {
                        transactionId: transaction.transactionId,
                        orderNumber: order.orderNumber,
                        amount: transaction.transactionAmount,
                        reason: notes || "Receipt could not be verified",
                        verifiedBy: superAdminId,
                    },
                    link: `/dashboards/super-admin/payment-verification`,
                });
            }
        }
        else {
            await session.commitTransaction();
            session.endSession();
        }
        return transaction;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Bank transfer verification error:", error);
        throw error;
    }
};
export const getPendingBankTransfers = async (page = 1, limit = 10) => {
    try {
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
    }
    catch (error) {
        console.error("Error fetching pending bank transfers:", error);
        throw error;
    }
};
export const getTransactionsByOrder = async (orderId, userRole, userId) => {
    try {
        const order = await Order.findById(orderId);
        if (!order)
            throw new Error("Order not found");
        if (userRole === UserRole.Customer && order.userId.toString() !== userId) {
            throw new Error("Unauthorized");
        }
        return Transaction.find({ orderId })
            .populate("verifiedBy", "email")
            .sort({ createdAt: -1 })
            .exec();
    }
    catch (error) {
        console.error("Error fetching transactions by order:", error);
        throw error;
    }
};
export const getTransactionsByInvoice = async (invoiceId) => {
    try {
        return Transaction.find({ invoiceId })
            .populate("verifiedBy", "email")
            .sort({ createdAt: -1 })
            .exec();
    }
    catch (error) {
        console.error("Error fetching transactions by invoice:", error);
        throw error;
    }
};
export const getUserTransactions = async (userId, page = 1, limit = 10) => {
    try {
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
    }
    catch (error) {
        console.error("Error fetching user transactions:", error);
        throw error;
    }
};
//# sourceMappingURL=paymentService.js.map