import { Invoice, InvoiceStatus, InvoiceType, } from "../model/invoiceModel.js";
import { Order, OrderStatus } from "../../order/model/orderModel.js";
import { User } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import emailService from "../../utils/email.js";
import { notificationService } from "../../notification/service/notificationService.js";
import mongoose from "mongoose";
import { generateInvoiceNumber } from "../../utils/invoiceUtils.js";
import { Shipping } from "../../shipping/model/shippingModel.js";
import { BankAccount } from "../../bankAccount/model/bankAccountModel.js";
export const createInvoice = async (orderId, data, superAdminId, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            throw new Error("Order not found for creating invoice");
        }
        const existingInvoice = await Invoice.findOne({
            orderId: order._id,
        }).session(session);
        if (existingInvoice) {
            throw new Error("Invoice already exists for this order");
        }
        let subtotal = 0;
        if (data.items && data.items.length > 0) {
            const priceMap = new Map();
            data.items.forEach((item) => {
                priceMap.set(item.productId.toString(), {
                    totalPrice: item.totalPrice,
                    quantity: item.quantity,
                });
            });
            order.items.forEach((item) => {
                const productId = item.productId.toString();
                const newPriceData = priceMap.get(productId);
                if (newPriceData) {
                    const newUnitPrice = newPriceData.totalPrice / newPriceData.quantity;
                    item.price = newUnitPrice;
                    console.log(`Updated item ${item.productName}: new unit price = ${newUnitPrice}`);
                }
            });
        }
        subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discount = data.discount || 0;
        const totalAmount = subtotal - discount;
        order.totalAmount = totalAmount;
        order.remainingBalance = totalAmount - (order.amountPaid || 0);
        console.log(`Order total updated: subtotal=${subtotal}, discount=${discount}, final=${totalAmount}`);
        let depositAmount = 0;
        let remainingAmount = totalAmount;
        if (data.paymentType === "part") {
            depositAmount = data.depositAmount || totalAmount * 0.3;
            remainingAmount = totalAmount - depositAmount;
        }
        // const activeBank = await BankAccount.findOne({ isActive: true })
        //   .sort({ updatedAt: -1 })
        //   .exec();
        // const defaultPaymentInstructions = activeBank
        //   ? `Bank transfer to ${activeBank.bankName} ${activeBank.accountNumber} (${activeBank.accountName})`
        //   : "Bank transfer";
        const invoiceNumber = await generateInvoiceNumber();
        const [invoice] = await Invoice.create([
            {
                orderId: order._id,
                orderNumber: order.orderNumber,
                invoiceNumber,
                invoiceType: InvoiceType.Main,
                items: order.items.map((item) => ({
                    description: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    total: item.price * item.quantity,
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
                paymentInstructions: "login to your dashboard to pay with paystack or view the bank account details for your payment",
                transactions: [],
            },
        ], { session });
        order.invoiceId = invoice._id;
        order.requiredPaymentType = data.paymentType;
        if (data.paymentType === "part") {
            order.requiredDeposit = depositAmount;
        }
        order.status = OrderStatus.InvoiceSent;
        await order.save({ session });
        await session.commitTransaction();
        const user = await User.findById(order.userId);
        const profile = await Profile.findOne({ userId: order.userId });
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
        if (user && profile) {
            //const dueDateStr = data.dueDate.toLocaleDateString();
            //   await emailService
            //     .sendInvoiceReady(
            //       user.email,
            //       profile.firstName,
            //       order.orderNumber,
            //       invoice.invoiceNumber,
            //       invoice.totalAmount,
            //       depositAmount || undefined,
            //       dueDateStr,
            //       invoice.items as any,
            //       activeBank
            //         ? {
            //             accountName: activeBank.accountName,
            //             accountNumber: activeBank.accountNumber,
            //             bankName: activeBank.bankName,
            //           }
            //         : undefined,
            //     )
            //     .catch((err) => console.error("Error sending invoice email:", err));
            io.to(`user-${user._id}`).emit("invoice-created", {
                invoiceId: invoice._id,
                orderId: order._id,
                orderNumber: order.orderNumber,
                totalAmount: invoice.totalAmount,
                dueDate: data.dueDate,
            });
        }
        try {
            await notificationService.createForUser(order.userId, {
                type: "invoice-created",
                title: "Invoice Created",
                message: `Invoice #${invoice.invoiceNumber} has been created for your order #${order.orderNumber}`,
                data: {
                    invoiceId: invoice._id,
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.totalAmount,
                    paymentType: data.paymentType,
                    depositAmount: depositAmount || undefined,
                },
                link: `/dashboards/customer/invoices/${invoice._id}`,
            });
            await notificationService.createForAdmins({
                type: "admin-invoice-created",
                title: "New Invoice Created",
                message: `Invoice #${invoice.invoiceNumber} created for order #${order.orderNumber} by admin`,
                data: {
                    invoiceId: invoice._id,
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.totalAmount,
                    customerId: order.userId,
                    createdBy: superAdminId,
                },
                link: `/dashboards/admin/invoices/${invoice._id}`,
            });
        }
        catch (notifErr) {
            console.error("Failed to create notifications:", notifErr);
        }
        return invoice;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
export const createShippingInvoice = async (orderId, shippingId, data, adminId, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
            throw new Error("Order not found");
        }
        const shipping = await Shipping.findById(shippingId).session(session);
        if (!shipping) {
            throw new Error("Shipping record not found");
        }
        const invoiceNumber = await generateInvoiceNumber();
        const activeBank = await BankAccount.findOne({ isActive: true })
            .sort({ updatedAt: -1 })
            .exec();
        const defaultPaymentInstructions = activeBank
            ? `Shipping payment - Bank transfer to ${activeBank.bankName} ${activeBank.accountNumber} (${activeBank.accountName})`
            : "Shipping payment - Bank transfer";
        const [invoice] = await Invoice.create([
            {
                orderId: order._id,
                orderNumber: order.orderNumber,
                invoiceNumber,
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
                paymentInstructions: defaultPaymentInstructions,
                shippingId: new mongoose.Types.ObjectId(shippingId),
                transactions: [],
            },
        ], { session });
        shipping.shippingInvoiceId = invoice._id;
        shipping.shippingCost = data.shippingCost;
        await shipping.save({ session });
        if (!order.shippingId) {
            order.shippingId = new mongoose.Types.ObjectId(shippingId);
        }
        await order.save({ session });
        await session.commitTransaction();
        const user = await User.findById(order.userId);
        const profile = await Profile.findOne({ userId: order.userId });
        io.to("admin-room").emit("new-shipping-invoice", {
            invoiceId: invoice._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: data.shippingCost,
        });
        io.to("superadmin-room").emit("new-shipping-invoice", {
            invoiceId: invoice._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: data.shippingCost,
        });
        try {
            await notificationService.createForUser(order.userId, {
                type: "shipping-invoice-created",
                title: "Shipping Invoice Created",
                message: `Shipping invoice of ₦${data.shippingCost.toLocaleString()} created for your order #${order.orderNumber}`,
                data: {
                    invoiceId: invoice._id,
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    invoiceNumber: invoice.invoiceNumber,
                    shippingCost: data.shippingCost,
                    shippingId: shippingId,
                },
                link: `/dashboards/customer/invoices/${invoice._id}`,
            });
            await notificationService.createForAdmins({
                type: "admin-shipping-invoice-created",
                title: "Shipping Invoice Created",
                message: `Shipping invoice of ₦${data.shippingCost.toLocaleString()} created for order #${order.orderNumber}`,
                data: {
                    invoiceId: invoice._id,
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    invoiceNumber: invoice.invoiceNumber,
                    shippingCost: data.shippingCost,
                    customerId: order.userId,
                },
                link: `/dashboards/admin/invoices/${invoice._id}`,
            });
        }
        catch (notifErr) {
            console.error("Failed to create shipping invoice notifications:", notifErr);
        }
        if (user && profile) {
            // const dueDateStr = data.dueDate.toLocaleDateString();
            //   await emailService
            //     .sendInvoiceReady(
            //       user.email,
            //       profile.firstName,
            //       order.orderNumber,
            //       invoice.invoiceNumber,
            //       data.shippingCost,
            //       undefined,
            //       dueDateStr,
            //       invoice.items as any,
            //       activeBank
            //         ? {
            //             accountName: activeBank.accountName,
            //             accountNumber: activeBank.accountNumber,
            //             bankName: activeBank.bankName,
            //           }
            //         : undefined,
            //     )
            // .catch((err) =>
            //   console.error("Error sending shipping invoice email:", err),
            // );
            io.to(`user-${user._id}`).emit("shipping-invoice-created", {
                invoiceId: invoice._id,
                orderId: order._id,
                orderNumber: order.orderNumber,
                amount: data.shippingCost,
                dueDate: data.dueDate,
            });
        }
        return invoice;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
export const updateInvoice = async (invoiceId, data, userId, userRole, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoice = await Invoice.findById(invoiceId).session(session);
        if (!invoice) {
            throw new Error("Invoice not found");
        }
        if (invoice.status !== InvoiceStatus.Draft) {
            throw new Error("Cannot update invoice that has been sent or paid");
        }
        const order = await Order.findById(invoice.orderId).session(session);
        if (!order) {
            throw new Error("Order not found");
        }
        const oldTotal = invoice.totalAmount;
        const oldDeposit = invoice.depositAmount;
        if (data.customItems && data.customItems.length > 0) {
            const priceMap = new Map();
            data.customItems.forEach((item) => {
                priceMap.set(item.productId.toString(), {
                    totalPrice: item.totalPrice,
                    quantity: item.quantity,
                });
            });
            order.items.forEach((item) => {
                const productId = item.productId.toString();
                const newPriceData = priceMap.get(productId);
                if (newPriceData) {
                    const newUnitPrice = newPriceData.totalPrice / newPriceData.quantity;
                    item.price = newUnitPrice;
                }
            });
            const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const discount = data.discount !== undefined ? data.discount : invoice.discount;
            const totalAmount = subtotal - discount;
            order.totalAmount = totalAmount;
            order.remainingBalance = totalAmount - (order.amountPaid || 0);
            await order.save({ session });
            invoice.items = order.items.map((item) => ({
                description: item.productName,
                quantity: item.quantity,
                unitPrice: item.price,
                total: item.price * item.quantity,
            }));
            invoice.subtotal = subtotal;
            invoice.discount = discount;
            invoice.totalAmount = totalAmount;
            if (invoice.invoiceType === InvoiceType.Main) {
                invoice.remainingAmount = totalAmount - invoice.amountPaid;
            }
        }
        else {
            if (data.discount !== undefined) {
                invoice.discount = data.discount;
                invoice.totalAmount = invoice.subtotal - invoice.discount;
                if (invoice.invoiceType === InvoiceType.Main) {
                    invoice.remainingAmount = invoice.totalAmount - invoice.amountPaid;
                }
            }
        }
        if (data.notes !== undefined)
            invoice.notes = data.notes;
        if (data.paymentInstructions !== undefined)
            invoice.paymentInstructions = data.paymentInstructions;
        if (data.dueDate !== undefined)
            invoice.dueDate = data.dueDate;
        await invoice.save({ session });
        await session.commitTransaction();
        const orderForNotif = await Order.findById(invoice.orderId);
        if (!orderForNotif) {
            console.error("Order not found for invoice:", invoice.orderId);
            return invoice;
        }
        const user = await User.findById(orderForNotif?.userId);
        const profile = await Profile.findOne({ userId: orderForNotif?.userId });
        io.to("admin-room").emit("invoice-updated", {
            invoiceId: invoice._id,
            orderId: invoice.orderId,
            orderNumber: orderForNotif?.orderNumber,
            status: invoice.status,
        });
        io.to("superadmin-room").emit("invoice-updated", {
            invoiceId: invoice._id,
            orderId: invoice.orderId,
            orderNumber: orderForNotif?.orderNumber,
            status: invoice.status,
        });
        if (user) {
            io.to(`user-${user._id}`).emit("invoice-updated", {
                invoiceId: invoice._id,
                orderId: invoice.orderId,
                orderNumber: orderForNotif?.orderNumber,
                totalAmount: invoice.totalAmount,
            });
            if (oldTotal !== invoice.totalAmount ||
                oldDeposit !== invoice.depositAmount) {
                try {
                    await notificationService.createForUser(user._id, {
                        type: "invoice-updated",
                        title: "Invoice Updated",
                        message: `Invoice #${invoice.invoiceNumber} has been updated. New total: ₦${invoice.totalAmount.toLocaleString()}`,
                        data: {
                            invoiceId: invoice._id,
                            orderId: orderForNotif._id,
                            orderNumber: orderForNotif.orderNumber,
                            invoiceNumber: invoice.invoiceNumber,
                            oldTotal,
                            newTotal: invoice.totalAmount,
                            oldDeposit,
                            newDeposit: invoice.depositAmount,
                        },
                        link: `/dashboards/customer/invoices/${invoice._id}`,
                    });
                    await notificationService.createForAdmins({
                        type: "admin-invoice-updated",
                        title: "Invoice Updated",
                        message: `Invoice #${invoice.invoiceNumber} for order #${orderForNotif.orderNumber} was updated`,
                        data: {
                            invoiceId: invoice._id,
                            orderId: orderForNotif._id,
                            orderNumber: orderForNotif.orderNumber,
                            invoiceNumber: invoice.invoiceNumber,
                            oldTotal,
                            newTotal: invoice.totalAmount,
                            updatedBy: userId,
                        },
                        link: `/dashboards/admin/invoices/${invoice._id}`,
                    });
                }
                catch (notifErr) {
                    console.error("Failed to create invoice update notifications:", notifErr);
                }
            }
        }
        if (user && profile && orderForNotif) {
            if (oldTotal !== invoice.totalAmount ||
                oldDeposit !== invoice.depositAmount) {
                // const activeBank = await BankAccount.findOne({ isActive: true })
                //   .sort({ updatedAt: -1 })
                //   .exec();
                await emailService
                    .sendInvoiceReady(user.email, profile.firstName, orderForNotif.orderNumber, invoice.invoiceNumber, invoice.totalAmount, invoice.depositAmount || undefined, invoice.dueDate.toLocaleDateString(), invoice.items)
                    .catch((err) => console.error("Error sending invoice update email:", err));
            }
        }
        return invoice;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
export const deleteInvoice = async (invoiceId, userRole, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoice = await Invoice.findById(invoiceId).session(session);
        if (!invoice) {
            throw new Error("Invoice not found");
        }
        if (invoice.status !== InvoiceStatus.Draft) {
            throw new Error("Cannot delete invoice that has been sent or paid");
        }
        const order = await Order.findById(invoice.orderId).session(session);
        await Invoice.findByIdAndDelete(invoiceId).session(session);
        await session.commitTransaction();
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
                try {
                    await notificationService.createForUser(user._id, {
                        type: "invoice-deleted",
                        title: "Invoice Deleted",
                        message: `Invoice #${invoice.invoiceNumber} for order #${order.orderNumber} has been deleted`,
                        data: {
                            invoiceId: invoice._id,
                            orderId: order._id,
                            orderNumber: order.orderNumber,
                            invoiceNumber: invoice.invoiceNumber,
                        },
                        link: `/dashboards/customer/orders/${order._id}`,
                    });
                    await notificationService.createForAdmins({
                        type: "admin-invoice-deleted",
                        title: "Invoice Deleted",
                        message: `Invoice #${invoice.invoiceNumber} for order #${order.orderNumber} was deleted`,
                        data: {
                            invoiceId: invoice._id,
                            orderId: order._id,
                            orderNumber: order.orderNumber,
                            invoiceNumber: invoice.invoiceNumber,
                        },
                        link: `/dashboards/admin/orders/${order._id}`,
                    });
                }
                catch (notifErr) {
                    console.error("Failed to create invoice deletion notifications:", notifErr);
                }
            }
        }
        return { message: "Invoice deleted successfully" };
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
export const sendInvoiceToCustomer = async (invoiceId, userId, userRole, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoice = await Invoice.findById(invoiceId)
            .populate({
            path: "orderId",
            populate: { path: "userId" },
        })
            .session(session);
        if (!invoice) {
            throw new Error("Invoice not found");
        }
        if (invoice.status !== InvoiceStatus.Draft) {
            throw new Error("Invoice has already been sent");
        }
        const order = invoice.orderId;
        const user = await User.findById(order.userId).session(session);
        const profile = await Profile.findOne({ userId: order.userId }).session(session);
        if (!user || !profile) {
            throw new Error("User or profile not found");
        }
        invoice.status = InvoiceStatus.Sent;
        await invoice.save({ session });
        await session.commitTransaction();
        // const activeBank = await BankAccount.findOne({ isActive: true })
        //   .sort({ updatedAt: -1 })
        //   .exec();
        await emailService
            .sendInvoiceReady(user.email, profile.firstName, order.orderNumber, invoice.invoiceNumber, invoice.totalAmount, invoice.depositAmount || undefined, invoice.dueDate.toLocaleDateString(), invoice.items)
            .catch((err) => console.error("Error sending invoice email:", err));
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
        try {
            await notificationService.createForUser(order.userId, {
                type: "invoice-sent",
                title: "Invoice Sent",
                message: `Invoice #${invoice.invoiceNumber} has been sent to you. Total: ₦${invoice.totalAmount.toLocaleString()}`,
                data: {
                    invoiceId: invoice._id,
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.totalAmount,
                    depositAmount: invoice.depositAmount || undefined,
                    dueDate: invoice.dueDate,
                },
                link: `/dashboards/customer/invoices/${invoice._id}`,
            });
            await notificationService.createForAdmins({
                type: "admin-invoice-sent",
                title: "Invoice Sent to Customer",
                message: `Invoice #${invoice.invoiceNumber} was sent to customer for order #${order.orderNumber}`,
                data: {
                    invoiceId: invoice._id,
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.totalAmount,
                    customerId: order.userId,
                },
                link: `/dashboards/admin/invoices/${invoice._id}`,
            });
        }
        catch (notifErr) {
            console.error("Failed to create invoice sent notifications:", notifErr);
        }
        return invoice;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
export const updateInvoicePayment = async (invoiceId, paymentAmount, transactionId, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const invoice = await Invoice.findById(invoiceId).session(session);
        if (!invoice) {
            throw new Error("Invoice not found");
        }
        invoice.transactions = invoice.transactions || [];
        invoice.transactions.push(new mongoose.Types.ObjectId(transactionId));
        invoice.amountPaid = (invoice.amountPaid || 0) + paymentAmount;
        invoice.remainingAmount = invoice.totalAmount - invoice.amountPaid;
        if (invoice.remainingAmount <= 0) {
            invoice.status = InvoiceStatus.Paid;
            invoice.paidAt = new Date();
        }
        else if (invoice.amountPaid > 0) {
            invoice.status = InvoiceStatus.PartiallyPaid;
        }
        await invoice.save({ session });
        await session.commitTransaction();
        const order = await Order.findById(invoice.orderId);
        const user = await User.findById(order?.userId);
        const profile = await Profile.findOne({ userId: order?.userId });
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
        if (order) {
            try {
                let title = "Payment Received";
                let message = `Payment of ₦${paymentAmount.toLocaleString()} received for invoice #${invoice.invoiceNumber}`;
                if (invoice.status === InvoiceStatus.Paid) {
                    title = "Invoice Paid";
                    message = `Invoice #${invoice.invoiceNumber} has been fully paid`;
                }
                else if (invoice.status === InvoiceStatus.PartiallyPaid) {
                    title = "Partial Payment Received";
                    message = `Partial payment of ₦${paymentAmount.toLocaleString()} received for invoice #${invoice.invoiceNumber}`;
                }
                await notificationService.createForUser(order.userId, {
                    type: "invoice-payment-updated",
                    title,
                    message,
                    data: {
                        invoiceId: invoice._id,
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        invoiceNumber: invoice.invoiceNumber,
                        amountPaid: paymentAmount,
                        totalPaid: invoice.amountPaid,
                        remainingAmount: invoice.remainingAmount,
                        status: invoice.status,
                    },
                    link: `/dashboards/customer/invoices/${invoice._id}`,
                });
                await notificationService.createForAdmins({
                    type: "admin-payment-received",
                    title: "Payment Received",
                    message: `Payment of ₦${paymentAmount.toLocaleString()} received for invoice #${invoice.invoiceNumber}`,
                    data: {
                        invoiceId: invoice._id,
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        invoiceNumber: invoice.invoiceNumber,
                        amountPaid: paymentAmount,
                        totalPaid: invoice.amountPaid,
                        remainingAmount: invoice.remainingAmount,
                        status: invoice.status,
                        customerId: order.userId,
                    },
                    link: `/dashboards/admin/invoices/${invoice._id}`,
                });
            }
            catch (notifErr) {
                console.error("Failed to create payment notifications:", notifErr);
            }
        }
        return invoice;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
export const getAllInvoices = async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const modelNames = mongoose.modelNames();
    const canPopulateTransactions = modelNames.includes("Transaction");
    const query = Invoice.find()
        .populate({
        path: "orderId",
        populate: { path: "userId", select: "email fullname" },
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    if (canPopulateTransactions) {
        query.populate("transactions");
    }
    const [invoices, total] = await Promise.all([
        query.exec(),
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
export const getInvoiceById = async (invoiceId, userId, userRole) => {
    const modelNames = mongoose.modelNames();
    const canPopulateTransactions = modelNames.includes("Transaction");
    const query = Invoice.findById(invoiceId).populate({
        path: "orderId",
        populate: { path: "userId", select: "email fullname" },
    });
    if (canPopulateTransactions) {
        query.populate("transactions");
    }
    const invoice = await query.exec();
    if (!invoice) {
        throw new Error("Invoice not found");
    }
    const order = invoice.orderId;
    if (userRole === "Customer" && order.userId._id.toString() !== userId) {
        throw new Error("Unauthorized to view this invoice");
    }
    return invoice;
};
export const getInvoiceByNumber = async (invoiceNumber, userId, userRole) => {
    const modelNames = mongoose.modelNames();
    const canPopulateTransactions = modelNames.includes("Transaction");
    const query = Invoice.findOne({ invoiceNumber }).populate({
        path: "orderId",
        populate: { path: "userId", select: "email fullname" },
    });
    if (canPopulateTransactions) {
        query.populate("transactions");
    }
    const invoice = await query.exec();
    if (!invoice) {
        throw new Error("Invoice not found");
    }
    const order = invoice.orderId;
    if (userRole === "Customer" && order.userId._id.toString() !== userId) {
        throw new Error("Unauthorized to view this invoice");
    }
    return invoice;
};
export const getInvoiceByOrderId = async (orderId, userId, userRole) => {
    const order = await Order.findById(orderId);
    if (!order) {
        throw new Error("Order not found");
    }
    if (userRole === "Customer" && order.userId.toString() !== userId) {
        throw new Error("Unauthorized to view this invoice");
    }
    const modelNames = mongoose.modelNames();
    const canPopulateTransactions = modelNames.includes("Transaction");
    const query = Invoice.findOne({ orderId }).populate({
        path: "orderId",
        populate: { path: "userId", select: "email fullname" },
    });
    if (canPopulateTransactions) {
        query.populate("transactions");
    }
    const invoice = await query.exec();
    return invoice;
};
export const getInvoiceByOrderNumber = async (orderNumber, userId, userRole) => {
    const order = await Order.findOne({ orderNumber });
    if (!order) {
        throw new Error("Order not found");
    }
    if (userRole === "Customer" && order.userId.toString() !== userId) {
        throw new Error("Unauthorized to view this invoice");
    }
    const modelNames = mongoose.modelNames();
    const canPopulateTransactions = modelNames.includes("Transaction");
    const query = Invoice.findOne({ orderId: order._id }).populate({
        path: "orderId",
        populate: { path: "userId", select: "email fullname" },
    });
    if (canPopulateTransactions) {
        query.populate("transactions");
    }
    const invoice = await query.exec();
    return invoice;
};
export const getUserInvoices = async (userId, page = 1, limit = 10) => {
    const orders = await Order.find({ userId }).select("_id").exec();
    const orderIds = orders.map((o) => o._id);
    const skip = (page - 1) * limit;
    const modelNames = mongoose.modelNames();
    const canPopulateTransactions = modelNames.includes("Transaction");
    const query = Invoice.find({ orderId: { $in: orderIds } })
        .populate("orderId", "orderNumber status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    if (canPopulateTransactions) {
        query.populate("transactions");
    }
    const [invoices, total] = await Promise.all([
        query.exec(),
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
export const filterInvoices = async (filters) => {
    const { status, invoiceType, startDate, endDate, minAmount, maxAmount, userId, orderId, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", } = filters;
    const query = {};
    if (status)
        query.status = status;
    if (invoiceType)
        query.invoiceType = invoiceType;
    if (orderId)
        query.orderId = new mongoose.Types.ObjectId(orderId);
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate)
            query.createdAt.$gte = startDate;
        if (endDate)
            query.createdAt.$lte = endDate;
    }
    if (minAmount !== undefined || maxAmount !== undefined) {
        query.totalAmount = {};
        if (minAmount !== undefined)
            query.totalAmount.$gte = minAmount;
        if (maxAmount !== undefined)
            query.totalAmount.$lte = maxAmount;
    }
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
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    const modelNames = mongoose.modelNames();
    const canPopulateTransactions = modelNames.includes("Transaction");
    const findQuery = Invoice.find(query)
        .populate({
        path: "orderId",
        populate: { path: "userId", select: "email fullname" },
    })
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);
    if (canPopulateTransactions) {
        findQuery.populate("transactions");
    }
    const [invoices, total] = await Promise.all([
        findQuery.exec(),
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
//# sourceMappingURL=invoiceService.js.map