import mongoose, { Types } from "mongoose";
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
import { generateOrderNumber } from "../../utils/orderUtils.js";
import { notificationService } from "../../notification/service/notificationService.js";
import { BankAccount } from "../../bankAccount/model/bankAccountModel.js";

const validStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.OrderReceived, OrderStatus.Cancelled],
  [OrderStatus.OrderReceived]: [
    OrderStatus.FilesUploaded,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.FilesUploaded]: [
    OrderStatus.AwaitingInvoice,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.AwaitingInvoice]: [
    OrderStatus.InvoiceSent,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.InvoiceSent]: [
    OrderStatus.AwaitingPartPayment,
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
  [OrderStatus.Approved]: [
    OrderStatus.InProduction,
    OrderStatus.AwaitingPartPayment,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.AwaitingPartPayment]: [
    OrderStatus.PartPaymentMade,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.PartPaymentMade]: [
    OrderStatus.InProduction,
    OrderStatus.AwaitingFinalPayment,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.InProduction]: [OrderStatus.Completed, OrderStatus.Cancelled],
  [OrderStatus.Completed]: [
    OrderStatus.ReadyForShipping,
    OrderStatus.AwaitingFinalPayment,
    OrderStatus.Delivered,
  ],
  [OrderStatus.AwaitingFinalPayment]: [
    OrderStatus.FinalPaid,
    OrderStatus.Cancelled,
  ],
  [OrderStatus.FinalPaid]: [
    OrderStatus.Completed,
    OrderStatus.ReadyForShipping,
    OrderStatus.Shipped,
    OrderStatus.Delivered,
  ],
  [OrderStatus.ReadyForShipping]: [OrderStatus.Shipped, OrderStatus.Delivered],
  [OrderStatus.Shipped]: [OrderStatus.Delivered],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Delivered]: [],
};

export const createOrder = async (
  userId: string,
  data: OrderData,
  io: Server,
): Promise<IOrderModel> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
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
    const products = await Product.find({ _id: { $in: productIds } }).session(session);
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
    
    const orderNumber = await generateOrderNumber();
    
    const [order] = await Order.create(
      [{
        userId: user._id,
        items: orderItems,
        totalAmount: totalAmount,
        amountPaid: 0,
        remainingBalance: 0,
        orderNumber,
        status: OrderStatus.OrderReceived,
        paymentStatus: PaymentStatus.Pending,
        createdAt: new Date(),
      }],
      { session },
    );

    const profile = await Profile.findOne({ userId: user._id }).session(session).exec();
    if (!profile) throw new Error("Profile not found");

    await session.commitTransaction();
    session.endSession();

    io.to("superadmin-room").emit("new-order", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      message: "New order created - requires invoice",
    });

    io.to("admin-room").emit("new-order", {
      orderId: order._id,
      orderNumber: order.orderNumber,
    });

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

    try {
      await notificationService.createForUser(user._id, {
        type: 'order-created',
        title: 'Order Created',
        message: `Order #${order.orderNumber} has been created successfully`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount,
          items: orderItems.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            price: item.price
          }))
        },
        link: `/dashboards/customer/orders/${order._id}`
      });

      await notificationService.createForAdmins({
        type: 'admin-new-order',
        title: 'New Order Received',
        message: `New order #${order.orderNumber} has been placed by ${profile.firstName}`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerId: user._id,
          customerName: `${profile.firstName} ${profile.lastName}`,
          totalAmount,
          itemCount: orderItems.length
        },
        link: `/dashboards/admin/orders/${order._id}`
      });
      
    } catch (notifErr) {
      console.error('Failed to create order notifications:', notifErr);
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const superAdminCreateOrder = async (
  customerId: string,
  data: OrderData,
  superAdminId: string,
  io: Server,
): Promise<IOrderModel> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customer = await User.findById(customerId).session(session);
    if (!customer) throw new Error("Customer not found");

    const items = data.items;
    if (!items || items.length === 0) {
      throw new Error("You must select at least one product");
    }

    const seenProductIds = new Set<string>();
    const orderItems = [];
    let totalAmount = 0;

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);
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

    const orderNumber = await generateOrderNumber();
    
    const [order] = await Order.create(
      [{
        userId: customer._id,
        items: orderItems,
        totalAmount: totalAmount,
        amountPaid: 0,
        remainingBalance: totalAmount,
        orderNumber,
        status: OrderStatus.OrderReceived,
        paymentStatus: PaymentStatus.Pending,
        createdBy: new Types.ObjectId(superAdminId),
        createdAt: new Date(),
      }],
      { session },
    );

    const profile = await Profile.findOne({ userId: customer._id }).session(session);
    
    await session.commitTransaction();
    session.endSession();

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

    try {
      await notificationService.createForUser(customer._id, {
        type: 'order-created',
        title: 'Order Created for You',
        message: `An order #${order.orderNumber} has been created for you by admin`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount,
          items: orderItems,
          createdBy: superAdminId
        },
        link: `/dashboards/customer/orders/${order._id}`
      });

      const superAdmin = await User.findById(superAdminId);
      await notificationService.createForAdmins({
        type: 'admin-order-created',
        title: 'Order Created by Admin',
        message: `Order #${order.orderNumber} was created for customer by ${superAdmin?.email || 'admin'}`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerId: customer._id,
          customerName: profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'Customer',
          totalAmount,
          itemCount: orderItems.length,
          createdBy: superAdminId
        },
        link: `/dashboards/admin/orders/${order._id}`
      });
      
    } catch (notifErr) {
      console.error('Failed to create order notifications:', notifErr);
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const updateOrder = async (
  orderId: string,
  data: Partial<IOrderModel>,
  userId: string,
  userRole: string,
): Promise<IOrderModel> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");

    const isOwner = order.userId.toString() === userId;
    const isAdmin = userRole === UserRole.SuperAdmin || userRole === UserRole.Admin;

    if (!isOwner && !isAdmin) {
      throw new Error("Unauthorized to update this order");
    }

    if (isOwner && !isAdmin) {
      const allowedFields = ["shippingAddress", "phoneNumber", "notes"];
      const updates = Object.keys(data);

      for (const field of updates) {
        if (!allowedFields.includes(field)) {
          throw new Error(`You cannot update the '${field}' field`);
        }
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      data,
      { new: true, runValidators: true, session },
    );

    if (!updatedOrder) throw new Error("Failed to update order");

    await session.commitTransaction();
    session.endSession();

    return updatedOrder;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const deleteOrder = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<string> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
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

    await Order.findByIdAndDelete(orderId).session(session);
    await session.commitTransaction();
    session.endSession();
    
    try {
      if (isSuperAdmin && !isOwner) {
        await notificationService.createForUser(order.userId, {
          type: 'order-deleted',
          title: 'Order Deleted',
          message: `Order #${order.orderNumber} has been deleted by admin`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            deletedBy: userId
          },
          link: `/dashboards/customer/orders`
        });

        await notificationService.createForAdmins({
          type: 'admin-order-deleted',
          title: 'Order Deleted',
          message: `Order #${order.orderNumber} was deleted by admin`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            customerId: order.userId,
            deletedBy: userId
          },
          link: `/dashboards/admin/orders`
        });
      }
    } catch (notifErr) {
      console.error('Failed to create order deletion notification:', notifErr);
    }

    return "Order deleted successfully";
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getOrderById = async (
  id: string,
  userId: string,
  userRole: string,
): Promise<IOrderModel> => {
  const order = await Order.findById(id)
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

export const getUserOrders = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: OrderStatus
): Promise<PaginatedOrder> => {
  const query: any = { userId: userId };
  
  if (status) {
    query.status = status;
  }
  
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'items.productName': { $regex: search, $options: 'i' } }
    ];
  }
  
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("items.productId", "name images")
      .populate("invoiceId")
      .populate("shippingId"),
    Order.countDocuments(query),
  ]);

  return {
    order: orders,
    total,
    page,
    limit,
  };
};

export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus,
  userId: string,
  userRole: string,
  io: Server,
): Promise<IOrderModel> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
      throw new Error("Unauthorized to update order status");
    }

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");

    const allowedTransitions = validStatusTransitions[order.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
    }

    const oldStatus = order.status;
    order.status = newStatus;
    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    const user = await User.findById(order.userId);
    const profile = await Profile.findOne({ userId: order.userId });

    if (newStatus === OrderStatus.AwaitingPartPayment) {
      io.to(`user-${order.userId}`).emit("order-awaiting-part-payment", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        depositAmount: order.requiredDeposit || order.totalAmount * 0.3,
        totalAmount: order.totalAmount,
        message: `A deposit of ₦${(order.requiredDeposit || order.totalAmount * 0.3).toLocaleString()} is required to proceed with your order.`,
      });

      if (user && profile) {
        await emailService
          .sendPaymentConfirmation(
            user.email,
            profile.firstName,
            order.orderNumber,
            order.requiredDeposit || order.totalAmount * 0.3,
            "part",
            "Bank Transfer or Paystack",
            order.totalAmount - (order.requiredDeposit || order.totalAmount * 0.3),
          )
          .catch((err: any) =>
            console.error("Error sending part payment email:", err),
          );
      }

      io.to("admin-room").emit("order-awaiting-part-payment", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: profile?.firstName || "Customer",
        depositAmount: order.requiredDeposit || order.totalAmount * 0.3,
        totalAmount: order.totalAmount,
      });
    }

    if (newStatus === OrderStatus.AwaitingFinalPayment) {
      io.to(`user-${order.userId}`).emit("order-awaiting-final-payment", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.remainingBalance,
        message: "Your order is complete! Please pay the remaining balance for shipping.",
      });

      if (user && profile) {
        const activeBank = await BankAccount.findOne({ isActive: true })
          .sort({ updatedAt: -1 })
          .exec();

        await emailService
          .sendFinalPaymentReminder(
            user.email,
            profile.firstName,
            order.orderNumber,
            order.remainingBalance,
            activeBank
              ? {
                  accountName: activeBank.accountName,
                  accountNumber: activeBank.accountNumber,
                  bankName: activeBank.bankName,
                }
              : undefined,
          )
          .catch((err: any) =>
            console.error("Error sending final payment reminder email:", err),
          );
      }

      io.to("admin-room").emit("order-awaiting-final-payment", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: profile?.firstName || "Customer",
        amount: order.remainingBalance,
      });
    }

    if (newStatus === OrderStatus.Completed) {
      io.to(`user-${order.userId}`).emit("order-ready-for-shipping-selection", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Your order is ready! Please log in to select a shipping method.",
      });

      if (user && profile) {
        await emailService
          .sendShippingSelectionReminder(
            user.email,
            profile.firstName,
            order.orderNumber,
            `${process.env.FRONTEND_URL}/orders/${order.orderNumber}/shipping`,
          )
          .catch((err: any) =>
            console.error("Error sending shipping selection email:", err),
          );
      }

      io.to("admin-room").emit("order-ready-for-shipping-selection", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: profile?.firstName || "Customer",
      });
    }

    if (newStatus === OrderStatus.ReadyForShipping) {
      io.to("admin-room").emit("order-ready-for-shipping", {
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    }

    if (newStatus === OrderStatus.Shipped) {
      io.to(`user-${order.userId}`).emit("order-shipped", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Your order has been shipped!",
      });

      if (user && profile) {
        await emailService
          .sendOrderShipped(
            user.email,
            profile.firstName,
            order.orderNumber,
          )
          .catch((err) =>
            console.error("Error sending order shipped email:", err),
          );
      }
    }

    if (newStatus === OrderStatus.Delivered) {
      if (user && profile) {
        await emailService
          .sendOrderDelivered(user.email, profile.firstName, order.orderNumber)
          .catch((err) =>
            console.error("Error sending order delivered email", err),
          );
      }
    }

    if (newStatus === OrderStatus.Cancelled) {
      if (user && profile) {
        await emailService
          .sendOrderCancelled(
            user.email,
            profile.firstName,
            order.orderNumber,
          )
          .catch((err) =>
            console.error("Error sending order cancelled email:", err),
          );
      }
    }

    io.to(`user-${order.userId}`).emit("order-status-updated", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: newStatus,
      oldStatus,
    });

    try {
      let title = 'Order Status Updated';
      let message = `Order #${order.orderNumber} status changed from ${oldStatus} to ${newStatus}`;
      
      if (newStatus === OrderStatus.AwaitingPartPayment) {
        title = 'Part Payment Required';
        message = `A deposit of ₦${(order.requiredDeposit || order.totalAmount * 0.3).toLocaleString()} is required for order #${order.orderNumber}`;
      } else if (newStatus === OrderStatus.Delivered) {
        title = 'Order Delivered';
        message = `Order #${order.orderNumber} has been delivered!`;
      } else if (newStatus === OrderStatus.InProduction) {
        title = 'Order In Production';
        message = `Order #${order.orderNumber} is now in production`;
      } else if (newStatus === OrderStatus.ReadyForShipping) {
        title = 'Order Ready for Shipping';
        message = `Order #${order.orderNumber} is ready for shipping`;
      } else if (newStatus === OrderStatus.AwaitingInvoice) {
        title = 'Order Awaiting Invoice';
        message = `Order #${order.orderNumber} is awaiting invoice generation`;
      } else if (newStatus === OrderStatus.FilesUploaded) {
        title = 'Briefs Submitted';
        message = `Customization briefs submitted for order #${order.orderNumber}`;
      } else if (newStatus === OrderStatus.AwaitingFinalPayment) {
        title = 'Final Payment Required';
        message = `Order #${order.orderNumber} is complete! Please pay the remaining balance of ₦${order.remainingBalance} to proceed with shipping.`;
      } else if (newStatus === OrderStatus.Completed) {
        title = 'Order Ready for Shipping Selection';
        message = `Order #${order.orderNumber} is ready! Please log in to select a shipping method.`;
      } else if (newStatus === OrderStatus.Shipped) {
        title = 'Order Shipped';
        message = `Order #${order.orderNumber} has been shipped!`;
      }
      
      await notificationService.createForUser(order.userId, {
        type: 'order-status-updated',
        title,
        message,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          oldStatus,
          newStatus,
          updatedBy: userId,
          ...(newStatus === OrderStatus.AwaitingPartPayment && { 
            depositAmount: order.requiredDeposit || order.totalAmount * 0.3,
            totalAmount: order.totalAmount 
          }),
          ...(newStatus === OrderStatus.AwaitingFinalPayment && { amount: order.remainingBalance }),
          ...(newStatus === OrderStatus.Completed && { shippingSelectionLink: `/orders/${order.orderNumber}/shipping` }),
        },
        link: newStatus === OrderStatus.Completed 
          ? `/orders/${order.orderNumber}/shipping`
          : `/dashboards/customer/orders/${order._id}`
      });

      const significantStatuses = [
        OrderStatus.AwaitingPartPayment,
        OrderStatus.AwaitingInvoice,
        OrderStatus.InProduction,
        OrderStatus.ReadyForShipping,
        OrderStatus.Delivered,
        OrderStatus.Cancelled,
        OrderStatus.AwaitingFinalPayment,
        OrderStatus.Completed,
        OrderStatus.Shipped,
      ];

      if (significantStatuses.includes(newStatus)) {
        await notificationService.createForAdmins({
          type: 'admin-order-status-updated',
          title: 'Order Status Updated',
          message: `Order #${order.orderNumber} status changed from ${oldStatus} to ${newStatus}`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            customerId: order.userId,
            oldStatus,
            newStatus,
            updatedBy: userId,
            ...(newStatus === OrderStatus.AwaitingPartPayment && { 
              depositAmount: order.requiredDeposit || order.totalAmount * 0.3,
              totalAmount: order.totalAmount 
            }),
            ...(newStatus === OrderStatus.AwaitingFinalPayment && { amount: order.remainingBalance }),
            ...(newStatus === OrderStatus.Completed && { requiresShippingSelection: true }),
          },
          link: `/dashboards/admin/orders/${order._id}`
        });
      }
      
    } catch (notifErr) {
      console.error('Failed to create order status notification:', notifErr);
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getAllOrders = async (
  userRole: string,
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
  }
): Promise<PaginatedOrder> => {
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  const query: any = {};

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters?.search && filters.search.trim() !== '') {
    const searchRegex = new RegExp(filters.search, 'i');
    
    const matchingUsers = await User.find({
      email: searchRegex
    }).select('_id');
    
    const matchingProfiles = await Profile.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { userName: searchRegex }
      ]
    }).select('userId');
    
    const userIds = [
      ...matchingUsers.map(u => u._id),
      ...matchingProfiles.map(p => p.userId)
    ];

    query.$or = [
      { orderNumber: searchRegex },
      { 'items.productName': searchRegex }
    ];

    if (userIds.length > 0) {
      query.$or.push({ userId: { $in: userIds } });
    }
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("userId", "email")
      .populate({
        path: "userId",
        populate: {
          path: "profile",
          model: "Profile",
          select: "firstName lastName userName"
        }
      })
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

export const getOrdersReadyForInvoice = async (
  userRole: string,
): Promise<IOrderModel[]> => {
  if (userRole !== UserRole.SuperAdmin) {
    throw new Error(
      "Unauthorized - Only super admin can view orders ready for invoice",
    );
  }

  return Order.find({
    status: OrderStatus.AwaitingInvoice,
    invoiceId: { $exists: false },
  })
    .populate("userId", "email fullname")
    .populate("items.productId", "name price")
    .sort({ createdAt: 1 })
    .exec();
};

export const markOrderAsAwaitingInvoice = async (
  orderId: string,
  userRole: string,
): Promise<IOrderModel> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (userRole !== UserRole.SuperAdmin && userRole !== UserRole.Admin) {
      throw new Error("Unauthorized - Only admin can mark order as awaiting invoice");
    }

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");

    if (order.status !== OrderStatus.FilesUploaded) {
      throw new Error(`Order must be in FilesUploaded status to mark as awaiting invoice. Current status: ${order.status}`);
    }

    order.status = OrderStatus.AwaitingInvoice;
    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const searchByOrderNumber = async (
  orderNumber: string,
  userId: string,
  userRole: string,
): Promise<IOrderModel> => {
    
  const order = await Order.findOne({ orderNumber })
    .populate("userId", "email fullname")
    .populate("items.productId", "name")
    .populate("invoiceId")
    .populate("shippingId");

  if (!order) throw new Error("Order not found");

  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    const orderUserId = order.userId._id?.toString() || order.userId.toString();
    
    if (orderUserId !== userId) {
      throw new Error("Unauthorized: You can only view your own orders");
    }
  }

  return order;
};

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

export const updateOrderPayment = async (
  orderId: string,
  paymentData: {
    amountPaid: number;
    paymentStatus: PaymentStatus;
    remainingBalance: number;
  },
): Promise<IOrderModel> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");

    order.amountPaid = paymentData.amountPaid;
    order.paymentStatus = paymentData.paymentStatus;
    order.remainingBalance = paymentData.remainingBalance;

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const linkInvoiceToOrder = async (
  orderId: string,
  invoiceId: Types.ObjectId,
  paymentType: "full" | "part",
  depositAmount?: number,
): Promise<IOrderModel> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");

    order.invoiceId = invoiceId;
    order.requiredPaymentType = paymentType;
    if (depositAmount) {
      order.requiredDeposit = depositAmount;
    }
    order.status = OrderStatus.InvoiceSent;

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const addItemToOrderService = async (
  orderId: string,
  userId: string,
  productId: string,
  quantity: number
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ _id: orderId, userId }).session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    const allowedStatuses = [
      OrderStatus.Pending,
      OrderStatus.OrderReceived,
      OrderStatus.FilesUploaded,
      OrderStatus.AwaitingInvoice
    ];

    if (!allowedStatuses.includes(order.status)) {
      throw new Error("Cannot add items to order in current status");
    }

    const product = await Product.findById(productId).session(session);

    if (!product) {
      throw new Error("Product not found");
    }

    const newItem = {
      productId: new Types.ObjectId(productId),
      productName: product.name,
      quantity,
      price: product.price,
      productSnapshot: {
        name: product.name,
        description: product.description,
        dimension: product.dimension,
        minOrder: product.minOrder,
        material: product.material,
      },
    };

    const existingItem = order.items.find(
      (item) => item.productId.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      order.items.push(newItem);
    }

    const itemTotal = product.price * quantity;

    order.totalAmount += itemTotal;
    order.remainingBalance += itemTotal;

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getUserActiveOrders = async (
  userId: string,
  statuses: OrderStatus[] = [
    OrderStatus.OrderReceived, 
    OrderStatus.Pending, 
    OrderStatus.FilesUploaded,
    OrderStatus.AwaitingInvoice
  ]
): Promise<IOrderModel[]> => {
  const orders = await Order.find({ 
    userId: userId,
    status: { $in: statuses }
  })
    .sort({ createdAt: -1 })
    .populate("items.productId", "name images")
    .exec();

  return orders;
};