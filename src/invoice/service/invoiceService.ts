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
import { notificationService } from "../../notification/service/notificationService.js";
import { Server } from "socket.io";
import mongoose from "mongoose"; 
import { generateInvoiceNumber } from "../../utils/invoiceUtils.js";
import { Transaction } from "../../payments/model/transactionModel.js";
import { Shipping } from "../../shipping/model/shippingModel.js";

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
    items?: Array<{
      productId: string;
      productName: string;
      quantity: number;
      totalPrice: number;
      originalTotal: number;
    }>;
  },
  superAdminId: string,
  io: Server,
): Promise<IInvoice> => {
  const session = await mongoose.startSession();
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

    // ===== UPDATE ORDER WITH NEW PRICES =====
    let subtotal = 0;
    
    if (data.items && data.items.length > 0) {
      // Create a map of productId to new total price
      const priceMap = new Map();
      data.items.forEach(item => {
        priceMap.set(item.productId.toString(), {
          totalPrice: item.totalPrice,
          quantity: item.quantity
        });
      });

      // Update each item in the order
      order.items.forEach(item => {
        const productId = item.productId.toString();
        const newPriceData = priceMap.get(productId);
        
        if (newPriceData) {
          // Calculate new unit price based on total price and quantity
          const newUnitPrice = newPriceData.totalPrice / newPriceData.quantity;
          
          // Update the item
          item.price = newUnitPrice;
          
          console.log(`Updated item ${item.productName}: new unit price = ${newUnitPrice}`);
        }
      });
    }

    // Calculate subtotal based on updated prices
    subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Apply discount to get final total
    const discount = data.discount || 0;
    const totalAmount = subtotal - discount;
    
    // Update order with the FINAL amount (after discount)
    order.totalAmount = totalAmount;
    order.remainingBalance = totalAmount - (order.amountPaid || 0);
    
    console.log(`Order total updated: subtotal=${subtotal}, discount=${discount}, final=${totalAmount}`);

    let depositAmount = 0;
    let remainingAmount = totalAmount;

    if (data.paymentType === "part") {
      depositAmount = data.depositAmount || totalAmount * 0.3;
      remainingAmount = totalAmount - depositAmount;
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice
    const [invoice] = await Invoice.create(
      [
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
          paymentInstructions:
            data.paymentInstructions || "Bank transfer to GTBank 0123456789",
          transactions: [],
        },
      ],
      { session },
    );

    // Update order with invoice details
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

    // Socket notifications
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

    // Email notification to customer
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

      io.to(`user-${user._id}`).emit("invoice-created", {
        invoiceId: invoice._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: invoice.totalAmount,
        dueDate: data.dueDate,
      });
    }

    // ✅ CREATE DATABASE NOTIFICATIONS
    try {
      // 1. Notify the customer
      await notificationService.createForUser(order.userId, {
        type: 'invoice-created',
        title: 'Invoice Created',
        message: `Invoice #${invoice.invoiceNumber} has been created for your order #${order.orderNumber}`,
        data: {
          invoiceId: invoice._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          paymentType: data.paymentType,
          depositAmount: depositAmount || undefined
        },
        link: `/dashboards/customer/invoices/${invoice._id}`
      });

      // 2. Notify all admins and super admins (excluding the one who created it)
      await notificationService.createForAdmins({
        type: 'admin-invoice-created',
        title: 'New Invoice Created',
        message: `Invoice #${invoice.invoiceNumber} created for order #${order.orderNumber} by admin`,
        data: {
          invoiceId: invoice._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          customerId: order.userId,
          createdBy: superAdminId
        },
        link: `/dashboards/admin/invoices/${invoice._id}`
      }); // Exclude the creator
      
    } catch (notifErr) {
      console.error('Failed to create notifications:', notifErr);
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error("Order not found");
    }

    // Get shipping record
    const shipping = await Shipping.findById(shippingId).session(session);
    if (!shipping) {
      throw new Error("Shipping record not found");
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create shipping invoice
    const [invoice] = await Invoice.create(
      [
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
          paymentInstructions: "Shipping payment - Bank transfer",
          shippingId: new mongoose.Types.ObjectId(shippingId),
          transactions: [],
        },
      ],
      { session },
    );

    // Update shipping record with invoice ID and shipping cost
    shipping.shippingInvoiceId = invoice._id;
    shipping.shippingCost = data.shippingCost; // Update the shipping cost
    await shipping.save({ session });

    // Update order with shipping ID (if not already set)
    if (!order.shippingId) {
      order.shippingId = new mongoose.Types.ObjectId(shippingId);
    }
    await order.save({ session });

    await session.commitTransaction();

    // Get user details for notifications
    const user = await User.findById(order.userId);
    const profile = await Profile.findOne({ userId: order.userId });

    // Socket notifications
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

    // ✅ CREATE DATABASE NOTIFICATIONS
    try {
      // 1. Notify the customer
      await notificationService.createForUser(order.userId, {
        type: 'shipping-invoice-created',
        title: 'Shipping Invoice Created',
        message: `Shipping invoice of ₦${data.shippingCost.toLocaleString()} created for your order #${order.orderNumber}`,
        data: {
          invoiceId: invoice._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceNumber: invoice.invoiceNumber,
          shippingCost: data.shippingCost,
          shippingId: shippingId
        },
        link: `/dashboards/customer/invoices/${invoice._id}`
      });

      // 2. Notify all admins and super admins
      await notificationService.createForAdmins({
        type: 'admin-shipping-invoice-created',
        title: 'Shipping Invoice Created',
        message: `Shipping invoice of ₦${data.shippingCost.toLocaleString()} created for order #${order.orderNumber}`,
        data: {
          invoiceId: invoice._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceNumber: invoice.invoiceNumber,
          shippingCost: data.shippingCost,
          customerId: order.userId
        },
        link: `/dashboards/admin/invoices/${invoice._id}`
      }); // Exclude the creator
      
    } catch (notifErr) {
      console.error('Failed to create shipping invoice notifications:', notifErr);
    }

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
  data: Partial<IInvoice> & { 
    customItems?: Array<{ 
      productId: string; 
      totalPrice: number; 
      quantity: number;
      productName?: string;
    }> 
  },
  userId: string,
  userRole: string,
  io: Server,
): Promise<IInvoice> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await Invoice.findById(invoiceId).session(session);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Only allow updates to draft invoices
    if (invoice.status !== InvoiceStatus.Draft) {
      throw new Error("Cannot update invoice that has been sent or paid");
    }

    const order = await Order.findById(invoice.orderId).session(session);
    if (!order) {
      throw new Error("Order not found");
    }

    // Track what changed for notifications
    const oldTotal = invoice.totalAmount;
    const oldDeposit = invoice.depositAmount;

    // If custom items are provided, update the order prices too
    if (data.customItems && data.customItems.length > 0) {
      // Create a map of productId to new total price
      const priceMap = new Map();
      data.customItems.forEach(item => {
        priceMap.set(item.productId.toString(), {
          totalPrice: item.totalPrice,
          quantity: item.quantity
        });
      });

      // Update order items with new prices
      order.items.forEach(item => {
        const productId = item.productId.toString();
        const newPriceData = priceMap.get(productId);
        
        if (newPriceData) {
          const newUnitPrice = newPriceData.totalPrice / newPriceData.quantity;
          item.price = newUnitPrice;
        }
      });

      // Calculate new subtotal based on updated order items
      const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Get discount (either from data or keep existing)
      const discount = data.discount !== undefined ? data.discount : invoice.discount;
      
      // Calculate final total with discount
      const totalAmount = subtotal - discount;
      
      // Update order with discounted amount
      order.totalAmount = totalAmount;
      order.remainingBalance = totalAmount - (order.amountPaid || 0);
      await order.save({ session });

      // Update invoice items based on updated order items
      invoice.items = order.items.map(item => ({
        description: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity
      }));

      // Update invoice financial fields
      invoice.subtotal = subtotal;
      invoice.discount = discount;
      invoice.totalAmount = totalAmount;

      // Recalculate remaining for part payment
      if (invoice.invoiceType === InvoiceType.Main) {
        invoice.remainingAmount = totalAmount - invoice.amountPaid;
      }
    } else {
      // Update other fields if no items change
      if (data.discount !== undefined) {
        invoice.discount = data.discount;
        invoice.totalAmount = invoice.subtotal - invoice.discount;
        
        if (invoice.invoiceType === InvoiceType.Main) {
          invoice.remainingAmount = invoice.totalAmount - invoice.amountPaid;
        }
      }
    }

    // Update metadata fields
    if (data.notes !== undefined) invoice.notes = data.notes;
    if (data.paymentInstructions !== undefined) invoice.paymentInstructions = data.paymentInstructions;
    if (data.dueDate !== undefined) invoice.dueDate = data.dueDate;

    await invoice.save({ session });
    await session.commitTransaction();

    // Get order for notifications
    const orderForNotif = await Order.findById(invoice.orderId);
   
    if (!orderForNotif) {
      console.error('Order not found for invoice:', invoice.orderId);
      return invoice; 
    }
    const user = await User.findById(orderForNotif?.userId);
    const profile = await Profile.findOne({ userId: orderForNotif?.userId });

    // Socket notifications
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

    // ✅ CREATE DATABASE NOTIFICATIONS
    if (user) {
      io.to(`user-${user._id}`).emit("invoice-updated", {
        invoiceId: invoice._id,
        orderId: invoice.orderId,
        orderNumber: orderForNotif?.orderNumber,
        totalAmount: invoice.totalAmount,
      });

      // Notify customer if amount changed
      if (oldTotal !== invoice.totalAmount || oldDeposit !== invoice.depositAmount) {
        try {
          await notificationService.createForUser(user._id, {
            type: 'invoice-updated',
            title: 'Invoice Updated',
            message: `Invoice #${invoice.invoiceNumber} has been updated. New total: ₦${invoice.totalAmount.toLocaleString()}`,
            data: {
              invoiceId: invoice._id,
              orderId: orderForNotif._id,
              orderNumber: orderForNotif.orderNumber,
              invoiceNumber: invoice.invoiceNumber,
              oldTotal,
              newTotal: invoice.totalAmount,
              oldDeposit,
              newDeposit: invoice.depositAmount
            },
            link: `/dashboards/customer/invoices/${invoice._id}`
          });

          // Also notify admins about the update
          await notificationService.createForAdmins({
            type: 'admin-invoice-updated',
            title: 'Invoice Updated',
            message: `Invoice #${invoice.invoiceNumber} for order #${orderForNotif.orderNumber} was updated`,
            data: {
              invoiceId: invoice._id,
              orderId: orderForNotif._id,
              orderNumber: orderForNotif.orderNumber,
              invoiceNumber: invoice.invoiceNumber,
              oldTotal,
              newTotal: invoice.totalAmount,
              updatedBy: userId
            },
            link: `/dashboards/admin/invoices/${invoice._id}`
          }); // Exclude the updater
          
        } catch (notifErr) {
          console.error('Failed to create invoice update notifications:', notifErr);
        }
      }
    }

    // Email notification if amount changed
    if (user && profile && orderForNotif) {
      if (oldTotal !== invoice.totalAmount || oldDeposit !== invoice.depositAmount) {
        await emailService
          .sendInvoiceReady(
            user.email,
            profile.firstName,
            orderForNotif.orderNumber,
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

    return invoice;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
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

  // Socket notifications
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

      // ✅ CREATE DATABASE NOTIFICATION FOR CUSTOMER
      try {
        await notificationService.createForUser(user._id, {
          type: 'invoice-deleted',
          title: 'Invoice Deleted',
          message: `Invoice #${invoice.invoiceNumber} for order #${order.orderNumber} has been deleted`,
          data: {
            invoiceId: invoice._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            invoiceNumber: invoice.invoiceNumber
          },
          link: `/dashboards/customer/orders/${order._id}`
        });

        // Notify admins about deletion
        await notificationService.createForAdmins({
          type: 'admin-invoice-deleted',
          title: 'Invoice Deleted',
          message: `Invoice #${invoice.invoiceNumber} for order #${order.orderNumber} was deleted`,
          data: {
            invoiceId: invoice._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            invoiceNumber: invoice.invoiceNumber
          },
          link: `/dashboards/admin/orders/${order._id}`
        });
        
      } catch (notifErr) {
        console.error('Failed to create invoice deletion notifications:', notifErr);
      }
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

  // Send email
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

  // Socket notifications
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

  // ✅ CREATE DATABASE NOTIFICATIONS
  try {
    // 1. Notify the customer
    await notificationService.createForUser(order.userId, {
      type: 'invoice-sent',
      title: 'Invoice Sent',
      message: `Invoice #${invoice.invoiceNumber} has been sent to you. Total: ₦${invoice.totalAmount.toLocaleString()}`,
      data: {
        invoiceId: invoice._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        depositAmount: invoice.depositAmount || undefined,
        dueDate: invoice.dueDate
      },
      link: `/dashboards/customer/invoices/${invoice._id}`
    });

    // 2. Notify admins that invoice was sent
    await notificationService.createForAdmins({
      type: 'admin-invoice-sent',
      title: 'Invoice Sent to Customer',
      message: `Invoice #${invoice.invoiceNumber} was sent to customer for order #${order.orderNumber}`,
      data: {
        invoiceId: invoice._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        customerId: order.userId
      },
      link: `/dashboards/admin/invoices/${invoice._id}`
    }); // Exclude the sender
    
  } catch (notifErr) {
    console.error('Failed to create invoice sent notifications:', notifErr);
  }

  return invoice;
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

  // Socket notifications
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

  // ✅ CREATE DATABASE NOTIFICATIONS
  if (order) {
    try {
      let title = 'Payment Received';
      let message = `Payment of ₦${paymentAmount.toLocaleString()} received for invoice #${invoice.invoiceNumber}`;
      
      if (invoice.status === InvoiceStatus.Paid) {
        title = 'Invoice Paid';
        message = `Invoice #${invoice.invoiceNumber} has been fully paid`;
      } else if (invoice.status === InvoiceStatus.PartiallyPaid) {
        title = 'Partial Payment Received';
        message = `Partial payment of ₦${paymentAmount.toLocaleString()} received for invoice #${invoice.invoiceNumber}`;
      }
      
      // 1. Notify the customer
      await notificationService.createForUser(order.userId, {
        type: 'invoice-payment-updated',
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
          status: invoice.status
        },
        link: `/dashboards/customer/invoices/${invoice._id}`
      });

      // 2. Notify admins about the payment
      await notificationService.createForAdmins({
        type: 'admin-payment-received',
        title: 'Payment Received',
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
          customerId: order.userId
        },
        link: `/dashboards/admin/invoices/${invoice._id}`
      });
      
    } catch (notifErr) {
      console.error('Failed to create payment notifications:', notifErr);
    }
  }

  return invoice;
};

// ==================== GET ALL INVOICES (Admin) ====================
export const getAllInvoices = async (
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedInvoices> => {
  const skip = (page - 1) * limit;

  // Check if Transaction model is registered
  const modelNames = mongoose.modelNames();
  const canPopulateTransactions = modelNames.includes('Transaction');

  const query = Invoice.find()
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Only populate transactions if the model exists
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

// ==================== GET INVOICE BY ID ====================
export const getInvoiceById = async (
  invoiceId: string,
  userId: string,
  userRole: string,
): Promise<IInvoice | null> => {
  // Check if Transaction model is registered
  const modelNames = mongoose.modelNames();
  const canPopulateTransactions = modelNames.includes('Transaction');

  const query = Invoice.findById(invoiceId)
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    });

  // Only populate transactions if the model exists
  if (canPopulateTransactions) {
    query.populate("transactions");
  }

  const invoice = await query.exec();

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
  // Check if Transaction model is registered
  const modelNames = mongoose.modelNames();
  const canPopulateTransactions = modelNames.includes('Transaction');

  const query = Invoice.findOne({ invoiceNumber })
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    });

  // Only populate transactions if the model exists
  if (canPopulateTransactions) {
    query.populate("transactions");
  }

  const invoice = await query.exec();

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

  // Check if Transaction model is registered
  const modelNames = mongoose.modelNames();
  const canPopulateTransactions = modelNames.includes('Transaction');

  const query = Invoice.findOne({ orderId })
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    });

  // Only populate transactions if the model exists
  if (canPopulateTransactions) {
    query.populate("transactions");
  }

  const invoice = await query.exec();

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

  // Check if Transaction model is registered
  const modelNames = mongoose.modelNames();
  const canPopulateTransactions = modelNames.includes('Transaction');

  const query = Invoice.findOne({ orderId: order._id })
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    });

  // Only populate transactions if the model exists
  if (canPopulateTransactions) {
    query.populate("transactions");
  }

  const invoice = await query.exec();

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

  // Check if Transaction model is registered
  const modelNames = mongoose.modelNames();
  const canPopulateTransactions = modelNames.includes('Transaction');

  const query = Invoice.find({ orderId: { $in: orderIds } })
    .populate("orderId", "orderNumber status")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Only populate transactions if the model exists
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

  // Check if Transaction model is registered
  const modelNames = mongoose.modelNames();
  const canPopulateTransactions = modelNames.includes('Transaction');

  const findQuery = Invoice.find(query)
    .populate({
      path: "orderId",
      populate: { path: "userId", select: "email fullname" },
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  // Only populate transactions if the model exists
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