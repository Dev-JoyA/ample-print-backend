// import mongoose from "mongoose";
// import {
//   Shipping,
//   IShipping,
//   ShippingMethod,
//   ShippingStatus,
// } from "../model/shippingModel.js";
// import { Order, OrderStatus } from "../../order/model/orderModel.js";
// import { User, UserRole } from "../../users/model/userModel.js";
// import { Profile } from "../../users/model/profileModel.js";
// import { Server } from "socket.io";
// import emailService from "../../utils/email.js";
// import { notificationService } from "../../notification/service/notificationService.js";

// export interface IShippingFilter {
//   status?: ShippingStatus;
//   method?: ShippingMethod;
//   orderId?: string;
//   userId?: string;
//   isPaid?: boolean;
//   startDate?: Date;
//   endDate?: Date;
//   page?: number;
//   limit?: number;
// }

// export interface PaginatedShipping {
//   shipping: IShipping[];
//   total: number;
//   page: number;
//   limit: number;
//   pages: number;
// }

// export interface ShippingAddress {
//   street: string;
//   city: string;
//   state: string;
//   country?: string;
// }

// export interface CreateShippingData {
//   shippingMethod: ShippingMethod;
//   address?: ShippingAddress;
//   pickupNotes?: string;
// }

// export const createShipping = async (
//   orderId: string,
//   data: CreateShippingData,
//   adminId: string,
//   io: Server,
// ): Promise<IShipping> => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const order = await Order.findById(orderId).session(session);
//     if (!order) {
//       throw new Error("Order not found");
//     }

//     if (
//       order.status !== OrderStatus.ReadyForShipping &&
//       order.status !== OrderStatus.Completed
//     ) {
//       throw new Error(
//         `Order must be in ReadyForShipping or Completed status to create shipping. Current status: ${order.status}`,
//       );
//     }

//     const existingShipping = await Shipping.findOne({ orderId }).session(session);
//     if (existingShipping) {
//       throw new Error("Shipping record already exists for this order");
//     }

//     if (data.shippingMethod === ShippingMethod.Delivery && !data.address) {
//       throw new Error("Address is required for delivery");
//     }

//     const profile = await Profile.findOne({ userId: order.userId }).session(session);
//     if (!profile) {
//       throw new Error("User profile not found");
//     }

//     const [shipping] = await Shipping.create(
//       [
//         {
//           orderId: order._id,
//           orderNumber: order.orderNumber,
//           shippingMethod: data.shippingMethod,
//           shippingCost: 0,
//           status: ShippingStatus.Pending,
//           isPaid: false,

//           ...(data.shippingMethod === ShippingMethod.Delivery && {
//             recipientName: `${profile.firstName} ${profile.lastName}`,
//             recipientPhone: profile.phoneNumber,
//             address: {
//               ...data.address,
//               country: data.address?.country || "Nigeria",
//             },
//           }),

//           metadata: {
//             createdBy: adminId,
//             pickupNotes: data.pickupNotes,
//           },
//         },
//       ],
//       { session },
//     );

//     order.shippingId = shipping._id;
//     await order.save({ session });

//     await session.commitTransaction();

//     const user = await User.findById(order.userId);

//     if (data.shippingMethod === ShippingMethod.Delivery) {
//       io.to(`user-${order.userId}`).emit("shipping-created", {
//         shippingId: shipping._id,
//         orderId: order._id,
//         orderNumber: order.orderNumber,
//         method: "delivery",
//         cost: 0,
//         address: data.address,
//         recipientName: `${profile.firstName} ${profile.lastName}`,
//         recipientPhone: profile.phoneNumber,
//       });

//       try {
//         await notificationService.createForUser(order.userId, {
//           type: 'shipping-created',
//           title: 'Shipping Created',
//           message: `Shipping has been set up for your order #${order.orderNumber}. Delivery cost: ₦${(0).toLocaleString()}`,
//           data: {
//             shippingId: shipping._id,
//             orderId: order._id,
//             orderNumber: order.orderNumber,
//             method: 'delivery',
//             cost: 0,
//             address: data.address,
//             recipientName: `${profile.firstName} ${profile.lastName}`,
//             recipientPhone: profile.phoneNumber
//           },
//           link: `/orders/${order._id}/shipping`
//         });
//       } catch (notifErr) {
//         console.error('Failed to create shipping notification:', notifErr);
//       }

//       if (user && profile) {
//         const addressStr = data.address
//           ? `${data.address.street}, ${data.address.city}, ${data.address.state}`
//           : "To be determined";

//         await emailService
//           .sendOrderShipped(
//             user.email,
//             profile.firstName,
//             order.orderNumber,
//             "Pending",
//             "N/A",
//             "To be determined",
//             addressStr,
//             `${process.env.FRONTEND_URL}/orders/${order.orderNumber}`,
//           )
//           .catch((err) => console.error("Error sending shipping email:", err));
//       }
//     } else {
//       io.to(`user-${order.userId}`).emit("pickup-ready", {
//         shippingId: shipping._id,
//         orderId: order._id,
//         orderNumber: order.orderNumber,
//         message: "Your order is ready for pickup at our store",
//         storeAddress: process.env.STORE_ADDRESS || "123 Main Street, Lagos",
//         storeHours: process.env.STORE_HOURS || "Mon-Fri 9am-5pm",
//       });

//       try {
//         await notificationService.createForUser(order.userId, {
//           type: 'pickup-ready',
//           title: 'Order Ready for Pickup',
//           message: `Your order #${order.orderNumber} is ready for pickup at our store.`,
//           data: {
//             shippingId: shipping._id,
//             orderId: order._id,
//             orderNumber: order.orderNumber,
//             method: 'pickup',
//             storeAddress: process.env.STORE_ADDRESS || "123 Main Street, Lagos",
//             storeHours: process.env.STORE_HOURS || "Mon-Fri 9am-5pm",
//             pickupNotes: data.pickupNotes
//           },
//           link: `/orders/${order._id}`
//         });
//       } catch (notifErr) {
//         console.error('Failed to create pickup notification:', notifErr);
//       }
//     }

//     io.to("admin-room").emit("shipping-created", {
//       shippingId: shipping._id,
//       orderId: order._id,
//       orderNumber: order.orderNumber,
//       method: data.shippingMethod,
//       cost: 0,
//     });

//     try {
//       await notificationService.createForAdmins({
//         type: 'admin-shipping-created',
//         title: 'Shipping Created',
//         message: `Shipping created for order #${order.orderNumber} (${data.shippingMethod})`,
//         data: {
//           shippingId: shipping._id,
//           orderId: order._id,
//           orderNumber: order.orderNumber,
//           method: data.shippingMethod,
//           cost: 0,
//           createdBy: adminId,
//           customerId: order.userId,
//           customerName: `${profile.firstName} ${profile.lastName}`
//         },
//         link: `/dashboards/admin/orders/${order._id}/shipping`
//       });
      
//     } catch (notifErr) {
//       console.error('Failed to create admin shipping notification:', notifErr);
//     }

//     return shipping;
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

// export const updateShippingTracking = async (
//   shippingId: string,
//   data: {
//     trackingNumber: string;
//     carrier?: string;
//     driverName?: string;
//     driverPhone?: string;
//     estimatedDelivery?: Date;
//   },
//   adminId: string,
//   io: Server,
// ): Promise<IShipping> => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const shipping = await Shipping.findById(shippingId).session(session);
//     if (!shipping) {
//       throw new Error("Shipping not found");
//     }

//     if (shipping.shippingMethod !== ShippingMethod.Delivery) {
//       throw new Error("Cannot add tracking number for pickup orders");
//     }

//     if (shipping.status !== ShippingStatus.Pending) {
//       throw new Error(`Cannot update tracking when status is ${shipping.status}`);
//     }

//     shipping.trackingNumber = data.trackingNumber;
    
//     if (data.carrier) {
//       shipping.carrier = data.carrier;
//     }
    
//     // ✅ ADD DRIVER FIELDS
//     if (data.driverName) {
//       shipping.driverName = data.driverName;
//     }
    
//     if (data.driverPhone) {
//       shipping.driverPhone = data.driverPhone;
//     }

//     // Add to tracking history
//     shipping.trackingHistory = shipping.trackingHistory || [];
//     shipping.trackingHistory.push({
//       status: ShippingStatus.Shipped,
//       location: "Warehouse",
//       description: `Package shipped via ${data.carrier || "courier"} with tracking ${data.trackingNumber}`,
//       timestamp: new Date(),
//     });

//     shipping.metadata = {
//       ...shipping.metadata,
//       carrier: data.carrier,
//       driverName: data.driverName,
//       driverPhone: data.driverPhone,
//       trackingUpdatedBy: adminId,
//       trackingUpdatedAt: new Date(),
//     };

//     if (data.estimatedDelivery) {
//       shipping.estimatedDelivery = data.estimatedDelivery;
//     }

//     shipping.status = ShippingStatus.Shipped;

//     await shipping.save({ session });
//     await session.commitTransaction();

//     const order = await Order.findById(shipping.orderId);
//     const user = await User.findById(order?.userId);
//     const profile = await Profile.findOne({ userId: order?.userId });

//     if (user && profile && order) {
//       io.to(`user-${user._id}`).emit("tracking-updated", {
//         shippingId: shipping._id,
//         orderId: order._id,
//         orderNumber: order.orderNumber,
//         trackingNumber: data.trackingNumber,
//         carrier: data.carrier,
//         driverName: data.driverName,
//         driverPhone: data.driverPhone,
//         estimatedDelivery: data.estimatedDelivery,
//         status: ShippingStatus.Shipped,
//       });

//       try {
//         await notificationService.createForUser(user._id, {
//           type: 'tracking-updated',
//           title: 'Tracking Information Added',
//           message: `Your order #${order.orderNumber} has been shipped. Tracking number: ${data.trackingNumber}`,
//           data: {
//             shippingId: shipping._id,
//             orderId: order._id,
//             orderNumber: order.orderNumber,
//             trackingNumber: data.trackingNumber,
//             carrier: data.carrier,
//             driverName: data.driverName,
//             driverPhone: data.driverPhone,
//             estimatedDelivery: data.estimatedDelivery
//           },
//           link: `/orders/${order._id}/tracking`
//         });
//       } catch (notifErr) {
//         console.error('Failed to create tracking notification:', notifErr);
//       }

//       const addressStr = shipping.address
//         ? `${shipping.address.street}, ${shipping.address.city}, ${shipping.address.state}`
//         : "Your address";

//       await emailService
//         .sendOrderShipped(
//           user.email,
//           profile.firstName,
//           order.orderNumber,
//           data.carrier || "Courier",
//           data.trackingNumber,
//           data.estimatedDelivery?.toLocaleDateString() || "To be determined",
//           addressStr,
//           `${process.env.TRACKING_BASE_URL}/${data.trackingNumber}`,
//         )
//         .catch((err) => console.error("Error sending tracking email:", err));
//     }

//     io.to("admin-room").emit("tracking-updated", {
//       shippingId: shipping._id,
//       orderId: shipping.orderId,
//       orderNumber: order?.orderNumber,
//       trackingNumber: data.trackingNumber,
//       carrier: data.carrier,
//       driverName: data.driverName,
//       driverPhone: data.driverPhone,
//       estimatedDelivery: data.estimatedDelivery,
//       status: ShippingStatus.Shipped,
//     });

//     try {
//       await notificationService.createForAdmins({
//         type: 'admin-tracking-updated',
//         title: 'Tracking Information Updated',
//         message: `Tracking #${data.trackingNumber} added for order #${order?.orderNumber}`,
//         data: {
//           shippingId: shipping._id,
//           orderId: shipping.orderId,
//           orderNumber: order?.orderNumber,
//           trackingNumber: data.trackingNumber,
//           carrier: data.carrier,
//           driverName: data.driverName,
//           driverPhone: data.driverPhone,
//           estimatedDelivery: data.estimatedDelivery,
//           updatedBy: adminId,
//           customerId: user?._id,
//           customerName: profile ? `${profile.firstName} ${profile.lastName}` : 'Customer'
//         },
//         link: `/dashboards/admin/orders/${order?._id}/shipping`
//       });
      
//     } catch (notifErr) {
//       console.error('Failed to create admin tracking notification:', notifErr);
//     }

//     return shipping;
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

// export const updateShippingStatus = async (
//   shippingId: string,
//   status: ShippingStatus,
//   adminId: string,
//   io: Server,
// ): Promise<IShipping> => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const shipping = await Shipping.findById(shippingId).session(session);
//     if (!shipping) {
//       throw new Error("Shipping not found");
//     }

//     const validTransitions: Record<ShippingStatus, ShippingStatus[]> = {
//       [ShippingStatus.Pending]: [
//         ShippingStatus.Shipped,
//         ShippingStatus.Delivered,
//       ],
//       [ShippingStatus.Shipped]: [ShippingStatus.Delivered],
//       [ShippingStatus.Delivered]: [],
//     };

//     if (!validTransitions[shipping.status].includes(status)) {
//       throw new Error(`Cannot transition from ${shipping.status} to ${status}`);
//     }

//     const oldStatus = shipping.status;
//     shipping.status = status;

//     if (status === ShippingStatus.Delivered) {
//       shipping.actualDelivery = new Date();
//     }

//     shipping.trackingHistory = shipping.trackingHistory || [];
//     shipping.trackingHistory.push({
//       status,
//       location:
//         status === ShippingStatus.Delivered ? "Destination" : "In transit",
//       description: `Status changed from ${oldStatus} to ${status}`,
//       timestamp: new Date(),
//     });

//     await shipping.save({ session });
//     await session.commitTransaction();

//     const order = await Order.findById(shipping.orderId);
//     const user = await User.findById(order?.userId);
//     const profile = await Profile.findOne({ userId: order?.userId });

//     if (user && profile && order) {
//       io.to(`user-${user._id}`).emit("shipping-status-updated", {
//         shippingId: shipping._id,
//         orderId: order._id,
//         orderNumber: order.orderNumber,
//         status,
//         trackingNumber: shipping.trackingNumber,
//         driverName: shipping.driverName,
//         driverPhone: shipping.driverPhone,
//         oldStatus,
//       });

//       try {
//         let title = 'Shipping Status Updated';
//         let message = `Your order #${order.orderNumber} shipping status changed from ${oldStatus} to ${status}`;
        
//         if (status === ShippingStatus.Delivered) {
//           title = 'Order Delivered';
//           message = `Your order #${order.orderNumber} has been delivered!`;
//         } else if (status === ShippingStatus.Shipped) {
//           title = 'Order Shipped';
//           message = `Your order #${order.orderNumber} has been shipped!`;
//         }

//         await notificationService.createForUser(user._id, {
//           type: 'shipping-status-updated',
//           title,
//           message,
//           data: {
//             shippingId: shipping._id,
//             orderId: order._id,
//             orderNumber: order.orderNumber,
//             oldStatus,
//             newStatus: status,
//             trackingNumber: shipping.trackingNumber,
//             driverName: shipping.driverName,
//             driverPhone: shipping.driverPhone
//           },
//           link: `/orders/${order._id}/tracking`
//         });
//       } catch (notifErr) {
//         console.error('Failed to create shipping status notification:', notifErr);
//       }

//       if (status === ShippingStatus.Delivered) {
//         await emailService
//           .sendOrderDelivered(user.email, profile.firstName, order.orderNumber)
//           .catch((err) => console.error("Error sending delivery email:", err));
//       }
//     }

//     io.to("admin-room").emit("shipping-status-updated", {
//       shippingId: shipping._id,
//       orderId: shipping.orderId,
//       orderNumber: order?.orderNumber,
//       status,
//       oldStatus,
//       driverName: shipping.driverName,
//       driverPhone: shipping.driverPhone,
//     });

//     try {
//       await notificationService.createForAdmins({
//         type: 'admin-shipping-status-updated',
//         title: 'Shipping Status Updated',
//         message: `Shipping status for order #${order?.orderNumber} changed from ${oldStatus} to ${status}`,
//         data: {
//           shippingId: shipping._id,
//           orderId: shipping.orderId,
//           orderNumber: order?.orderNumber,
//           oldStatus,
//           newStatus: status,
//           trackingNumber: shipping.trackingNumber,
//           driverName: shipping.driverName,
//           driverPhone: shipping.driverPhone,
//           updatedBy: adminId,
//           customerId: user?._id,
//           customerName: profile ? `${profile.firstName} ${profile.lastName}` : 'Customer'
//         },
//         link: `/dashboards/admin/orders/${order?._id}/shipping`
//       });
      
//     } catch (notifErr) {
//       console.error('Failed to create admin shipping status notification:', notifErr);
//     }

//     return shipping;
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

// export const markShippingAsPaid = async (
//   shippingId: string,
//   invoiceId: string,
// ): Promise<IShipping> => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const shipping = await Shipping.findById(shippingId).session(session);
//     if (!shipping) {
//       throw new Error("Shipping not found");
//     }

//     shipping.isPaid = true;
//     shipping.shippingInvoiceId = new mongoose.Types.ObjectId(invoiceId);
//     await shipping.save({ session });
//     await session.commitTransaction();

//     const order = await Order.findById(shipping.orderId);
//     const user = await User.findById(order?.userId);
//     const profile = await Profile.findOne({ userId: order?.userId });

//     if (user && order) {
//       try {
//         await notificationService.createForUser(user._id, {
//           type: 'shipping-paid',
//           title: 'Shipping Payment Received',
//           message: `Your shipping payment for order #${order.orderNumber} has been received.`,
//           data: {
//             shippingId: shipping._id,
//             orderId: order._id,
//             orderNumber: order.orderNumber,
//             invoiceId,
//             cost: shipping.shippingCost
//           },
//           link: `/orders/${order._id}`
//         });

//         await notificationService.createForAdmins({
//           type: 'admin-shipping-paid',
//           title: 'Shipping Payment Received',
//           message: `Shipping payment of ₦${(shipping.shippingCost ?? 0).toLocaleString()} received for order #${order.orderNumber}`,
//           data: {
//             shippingId: shipping._id,
//             orderId: order._id,
//             orderNumber: order.orderNumber,
//             invoiceId,
//             cost: shipping.shippingCost,
//             customerId: user._id,
//             customerName: profile ? `${profile.firstName} ${profile.lastName}` : 'Customer'
//           },
//           link: `/dashboards/admin/orders/${order._id}/shipping`
//         });
        
//       } catch (notifErr) {
//         console.error('Failed to create shipping paid notifications:', notifErr);
//       }
//     }

//     return shipping;
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

// export const getShippingById = async (
//   shippingId: string,
//   userId: string,
//   userRole: string,
// ): Promise<IShipping | null> => {
//   const shipping = await Shipping.findById(shippingId)
//     .populate({
//       path: "orderId",
//       select: "orderNumber userId status totalAmount",
//       populate: {
//         path: "userId",
//         select: "email",
//       }
//     });

//   if (!shipping) {
//     throw new Error("Shipping not found");
//   }

//   const order = shipping.orderId as any;

//   if (userRole === "Customer" && order.userId._id.toString() !== userId) {
//     throw new Error("Unauthorized to view this shipping");
//   }

//   return shipping;
// };

// export const getShippingByOrderId = async (
//   orderId: string,
//   userId: string,
//   userRole: string,
// ): Promise<IShipping | null> => {
//   const order = await Order.findById(orderId);
//   if (!order) {
//     throw new Error("Order not found");
//   }

//   if (userRole === "Customer" && order.userId.toString() !== userId) {
//     throw new Error("Unauthorized to view this shipping");
//   }

//   const shipping = await Shipping.findOne({ orderId }).populate({
//     path: "orderId",
//     populate: {
//       path: "userId",
//       model: "User",
//       select: "email"
//     }
//   });

//   return shipping;
// };

// export const getAllShipping = async (
//   page: number = 1,
//   limit: number = 10,
// ): Promise<PaginatedShipping> => {
//   const skip = (page - 1) * limit;

//   const [shipping, total] = await Promise.all([
//     Shipping.find()
//       .populate({
//         path: "orderId",
//         populate: {
//           path: "userId",
//           model: "User",
//           select: "email"
//         }
//       })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .exec(),
//     Shipping.countDocuments(),
//   ]);

//   return {
//     shipping,
//     total,
//     page,
//     limit,
//     pages: Math.ceil(total / limit),
//   };
// };

// export const filterShipping = async (
//   filters: IShippingFilter,
// ): Promise<PaginatedShipping> => {
//   const {
//     status,
//     method,
//     orderId,
//     userId,
//     isPaid,
//     startDate,
//     endDate,
//     page = 1,
//     limit = 10,
//   } = filters;

//   const query: any = {};

//   if (status) query.status = status;
//   if (method) query.shippingMethod = method;
//   if (orderId) query.orderId = new mongoose.Types.ObjectId(orderId);
//   if (isPaid !== undefined) query.isPaid = isPaid;

//   if (userId) {
//     const orders = await Order.find({
//       userId: new mongoose.Types.ObjectId(userId),
//     }).select("_id");
//     const orderIds = orders.map((o) => o._id);
//     query.orderId = { $in: orderIds };
//   }

//   if (startDate || endDate) {
//     query.createdAt = {};
//     if (startDate) query.createdAt.$gte = startDate;
//     if (endDate) query.createdAt.$lte = endDate;
//   }

//   const skip = (page - 1) * limit;

//   const [shipping, total] = await Promise.all([
//     Shipping.find(query)
//       .populate({
//         path: "orderId",
//         populate: {
//           path: "userId",
//           model: "User",
//           select: "email"
//         }
//       })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .exec(),
//     Shipping.countDocuments(query),
//   ]);

//   return {
//     shipping,
//     total,
//     page,
//     limit,
//     pages: Math.ceil(total / limit),
//   };
// };

// export const getShippingNeedingInvoice = async (): Promise<IShipping[]> => {
//   return Shipping.find({
//     shippingInvoiceId: { $exists: false },
//     isPaid: false,
//   })
//     .populate("orderId", "orderNumber userId")
//     .sort({ createdAt: 1 })
//     .exec();
// };

// export const getPendingShipping = async (): Promise<IShipping[]> => {
//   return Shipping.find({
//     status: ShippingStatus.Pending,
//   })
//     .populate("orderId", "orderNumber userId")
//     .sort({ createdAt: 1 })
//     .exec();
// };

import mongoose from "mongoose";
import {
  Shipping,
  IShipping,
  ShippingMethod,
  ShippingStatus,
} from "../model/shippingModel.js";
import { Order, OrderStatus } from "../../order/model/orderModel.js";
import { User, UserRole } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import { Server } from "socket.io";
import emailService from "../../utils/email.js";
import { notificationService } from "../../notification/service/notificationService.js";

export interface IShippingFilter {
  status?: ShippingStatus;
  method?: ShippingMethod;
  orderId?: string;
  userId?: string;
  isPaid?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedShipping {
  shipping: IShipping[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  country?: string;
}

export interface CreateShippingData {
  shippingMethod: ShippingMethod;
  address?: ShippingAddress;
  pickupNotes?: string;
}

export const createShipping = async (
  orderId: string,
  data: CreateShippingData,
  adminId: string,
  io: Server,
): Promise<IShipping> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error("Order not found");
    }

    if (
      order.status !== OrderStatus.ReadyForShipping &&
      order.status !== OrderStatus.Completed
    ) {
      throw new Error(
        `Order must be in ReadyForShipping or Completed status to create shipping. Current status: ${order.status}`,
      );
    }

    const existingShipping = await Shipping.findOne({ orderId }).session(session);
    if (existingShipping) {
      throw new Error("Shipping record already exists for this order");
    }

    if (data.shippingMethod === ShippingMethod.Delivery && !data.address) {
      throw new Error("Address is required for delivery");
    }

    const profile = await Profile.findOne({ userId: order.userId }).session(session);
    if (!profile) {
      throw new Error("User profile not found");
    }

    const [shipping] = await Shipping.create(
      [
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          shippingMethod: data.shippingMethod,
          shippingCost: 0,
          status: ShippingStatus.Pending,
          isPaid: false,

          ...(data.shippingMethod === ShippingMethod.Delivery && {
            recipientName: `${profile.firstName} ${profile.lastName}`,
            recipientPhone: profile.phoneNumber,
            address: {
              ...data.address,
              country: data.address?.country || "Nigeria",
            },
          }),

          metadata: {
            createdBy: adminId,
            pickupNotes: data.pickupNotes,
          },
        },
      ],
      { session },
    );

    order.shippingId = shipping._id;
    await order.save({ session });

    await session.commitTransaction();

    const user = await User.findById(order.userId);

    if (data.shippingMethod === ShippingMethod.Delivery) {
      io.to(`user-${order.userId}`).emit("shipping-created", {
        shippingId: shipping._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        method: "delivery",
        cost: 0,
        address: data.address,
        recipientName: `${profile.firstName} ${profile.lastName}`,
        recipientPhone: profile.phoneNumber,
      });

      try {
        await notificationService.createForUser(order.userId, {
          type: 'shipping-created',
          title: 'Shipping Created',
          message: `Shipping has been set up for your order #${order.orderNumber}. Delivery cost: ₦${(0).toLocaleString()}`,
          data: {
            shippingId: shipping._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            method: 'delivery',
            cost: 0,
            address: data.address,
            recipientName: `${profile.firstName} ${profile.lastName}`,
            recipientPhone: profile.phoneNumber
          },
          link: `/orders/${order._id}/shipping`
        });
      } catch (notifErr) {
        console.error('Failed to create shipping notification:', notifErr);
      }

      // FIXED: Use sendShippingCreated instead of sendOrderShipped
      if (user && profile) {
        const addressStr = data.address
          ? `${data.address.street}, ${data.address.city}, ${data.address.state}`
          : "To be determined";

        await emailService
          .sendShippingCreated(
            user.email,
            profile.firstName,
            order.orderNumber,
            "delivery",
            0,
            addressStr,
            `${profile.firstName} ${profile.lastName}`,
            profile.phoneNumber,
            process.env.STORE_ADDRESS || "5 Boyle Street Shomolu, Lagos",
            process.env.STORE_HOURS || "Mon-Fri 9am-5pm",
          )
          .catch((err) => console.error("Error sending shipping created email:", err));
      }
    } else {
      io.to(`user-${order.userId}`).emit("pickup-ready", {
        shippingId: shipping._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Your order is ready for pickup at our store",
        storeAddress: process.env.STORE_ADDRESS || "123 Main Street, Lagos",
        storeHours: process.env.STORE_HOURS || "Mon-Fri 9am-5pm",
      });

      try {
        await notificationService.createForUser(order.userId, {
          type: 'pickup-ready',
          title: 'Order Ready for Pickup',
          message: `Your order #${order.orderNumber} is ready for pickup at our store.`,
          data: {
            shippingId: shipping._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            method: 'pickup',
            storeAddress: process.env.STORE_ADDRESS || "123 Main Street, Lagos",
            storeHours: process.env.STORE_HOURS || "Mon-Fri 9am-5pm",
            pickupNotes: data.pickupNotes
          },
          link: `/orders/${order._id}`
        });
      } catch (notifErr) {
        console.error('Failed to create pickup notification:', notifErr);
      }

      if (user && profile) {
        await emailService
          .sendShippingCreated(
            user.email,
            profile.firstName,
            order.orderNumber,
            "pickup",
            0,
            undefined,
            undefined,
            undefined,
            process.env.STORE_ADDRESS || "5 Boyle Street Shomolu, Lagos",
            process.env.STORE_HOURS || "Mon-Fri 9am-5pm",
          )
          .catch((err) => console.error("Error sending pickup ready email:", err));
      }
    }

    io.to("admin-room").emit("shipping-created", {
      shippingId: shipping._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      method: data.shippingMethod,
      cost: 0,
    });

    try {
      await notificationService.createForAdmins({
        type: 'admin-shipping-created',
        title: 'Shipping Created',
        message: `Shipping created for order #${order.orderNumber} (${data.shippingMethod})`,
        data: {
          shippingId: shipping._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          method: data.shippingMethod,
          cost: 0,
          createdBy: adminId,
          customerId: order.userId,
          customerName: `${profile.firstName} ${profile.lastName}`
        },
        link: `/dashboards/admin/orders/${order._id}/shipping`
      });
      
    } catch (notifErr) {
      console.error('Failed to create admin shipping notification:', notifErr);
    }

    return shipping;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const updateShippingTracking = async (
  shippingId: string,
  data: {
    trackingNumber: string;
    carrier?: string;
    driverName?: string;
    driverPhone?: string;
    estimatedDelivery?: Date;
  },
  adminId: string,
  io: Server,
): Promise<IShipping> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shipping = await Shipping.findById(shippingId).session(session);
    if (!shipping) {
      throw new Error("Shipping not found");
    }

    if (shipping.shippingMethod !== ShippingMethod.Delivery) {
      throw new Error("Cannot add tracking number for pickup orders");
    }

    if (shipping.status !== ShippingStatus.Pending) {
      throw new Error(`Cannot update tracking when status is ${shipping.status}`);
    }

    shipping.trackingNumber = data.trackingNumber;
    
    if (data.carrier) {
      shipping.carrier = data.carrier;
    }
    
    if (data.driverName) {
      shipping.driverName = data.driverName;
    }
    
    if (data.driverPhone) {
      shipping.driverPhone = data.driverPhone;
    }

    shipping.trackingHistory = shipping.trackingHistory || [];
    shipping.trackingHistory.push({
      status: ShippingStatus.Shipped,
      location: "Warehouse",
      description: `Package shipped via ${data.carrier || "courier"} with tracking ${data.trackingNumber}`,
      timestamp: new Date(),
    });

    shipping.metadata = {
      ...shipping.metadata,
      carrier: data.carrier,
      driverName: data.driverName,
      driverPhone: data.driverPhone,
      trackingUpdatedBy: adminId,
      trackingUpdatedAt: new Date(),
    };

    if (data.estimatedDelivery) {
      shipping.estimatedDelivery = data.estimatedDelivery;
    }

    shipping.status = ShippingStatus.Shipped;

    await shipping.save({ session });
    await session.commitTransaction();

    const order = await Order.findById(shipping.orderId);
    const user = await User.findById(order?.userId);
    const profile = await Profile.findOne({ userId: order?.userId });

    if (user && profile && order) {
      io.to(`user-${user._id}`).emit("tracking-updated", {
        shippingId: shipping._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: data.trackingNumber,
        carrier: data.carrier,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        estimatedDelivery: data.estimatedDelivery,
        status: ShippingStatus.Shipped,
      });

      try {
        await notificationService.createForUser(user._id, {
          type: 'tracking-updated',
          title: 'Tracking Information Added',
          message: `Your order #${order.orderNumber} has been shipped. Tracking number: ${data.trackingNumber}`,
          data: {
            shippingId: shipping._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            trackingNumber: data.trackingNumber,
            carrier: data.carrier,
            driverName: data.driverName,
            driverPhone: data.driverPhone,
            estimatedDelivery: data.estimatedDelivery
          },
          link: `/orders/${order._id}/tracking`
        });
      } catch (notifErr) {
        console.error('Failed to create tracking notification:', notifErr);
      }

    //   const addressStr = shipping.address
    //     ? `${shipping.address.street}, ${shipping.address.city}, ${shipping.address.state}`
    //     : "Your address";

    //   await emailService
    //     .sendOrderShipped(
    //       user.email,
    //       profile.firstName,
    //       order.orderNumber,
    //       data.carrier || "Courier",
    //       data.trackingNumber,
    //       data.estimatedDelivery?.toLocaleDateString() || "To be determined",
    //       addressStr,
    //       `${process.env.TRACKING_BASE_URL}/${data.trackingNumber}`,
    //     )
    //     .catch((err) => console.error("Error sending tracking email:", err));
     }

    io.to("admin-room").emit("tracking-updated", {
      shippingId: shipping._id,
      orderId: shipping.orderId,
      orderNumber: order?.orderNumber,
      trackingNumber: data.trackingNumber,
      carrier: data.carrier,
      driverName: data.driverName,
      driverPhone: data.driverPhone,
      estimatedDelivery: data.estimatedDelivery,
      status: ShippingStatus.Shipped,
    });

    try {
      await notificationService.createForAdmins({
        type: 'admin-tracking-updated',
        title: 'Tracking Information Updated',
        message: `Tracking #${data.trackingNumber} added for order #${order?.orderNumber}`,
        data: {
          shippingId: shipping._id,
          orderId: shipping.orderId,
          orderNumber: order?.orderNumber,
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
          driverName: data.driverName,
          driverPhone: data.driverPhone,
          estimatedDelivery: data.estimatedDelivery,
          updatedBy: adminId,
          customerId: user?._id,
          customerName: profile ? `${profile.firstName} ${profile.lastName}` : 'Customer'
        },
        link: `/dashboards/admin/orders/${order?._id}/shipping`
      });
      
    } catch (notifErr) {
      console.error('Failed to create admin tracking notification:', notifErr);
    }

    return shipping;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const updateShippingStatus = async (
  shippingId: string,
  status: ShippingStatus,
  adminId: string,
  io: Server,
): Promise<IShipping> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shipping = await Shipping.findById(shippingId).session(session);
    if (!shipping) {
      throw new Error("Shipping not found");
    }

    const validTransitions: Record<ShippingStatus, ShippingStatus[]> = {
      [ShippingStatus.Pending]: [
        ShippingStatus.Shipped,
        ShippingStatus.Delivered,
      ],
      [ShippingStatus.Shipped]: [ShippingStatus.Delivered],
      [ShippingStatus.Delivered]: [],
    };

    if (!validTransitions[shipping.status].includes(status)) {
      throw new Error(`Cannot transition from ${shipping.status} to ${status}`);
    }

    const oldStatus = shipping.status;
    shipping.status = status;

    if (status === ShippingStatus.Delivered) {
      shipping.actualDelivery = new Date();
    }

    shipping.trackingHistory = shipping.trackingHistory || [];
    shipping.trackingHistory.push({
      status,
      location:
        status === ShippingStatus.Delivered ? "Destination" : "In transit",
      description: `Status changed from ${oldStatus} to ${status}`,
      timestamp: new Date(),
    });

    await shipping.save({ session });
    await session.commitTransaction();

    const order = await Order.findById(shipping.orderId);
    const user = await User.findById(order?.userId);
    const profile = await Profile.findOne({ userId: order?.userId });

    if (user && profile && order) {
      io.to(`user-${user._id}`).emit("shipping-status-updated", {
        shippingId: shipping._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        status,
        trackingNumber: shipping.trackingNumber,
        driverName: shipping.driverName,
        driverPhone: shipping.driverPhone,
        oldStatus,
      });

      try {
        let title = 'Shipping Status Updated';
        let message = `Your order #${order.orderNumber} shipping status changed from ${oldStatus} to ${status}`;
        
        if (status === ShippingStatus.Delivered) {
          title = 'Order Delivered';
          message = `Your order #${order.orderNumber} has been delivered!`;
        } else if (status === ShippingStatus.Shipped) {
          title = 'Order Shipped';
          message = `Your order #${order.orderNumber} has been shipped!`;
        }

        await notificationService.createForUser(user._id, {
          type: 'shipping-status-updated',
          title,
          message,
          data: {
            shippingId: shipping._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            oldStatus,
            newStatus: status,
            trackingNumber: shipping.trackingNumber,
            driverName: shipping.driverName,
            driverPhone: shipping.driverPhone
          },
          link: `/orders/${order._id}/tracking`
        });
      } catch (notifErr) {
        console.error('Failed to create shipping status notification:', notifErr);
      }

      if (status === ShippingStatus.Delivered) {
        await emailService
          .sendOrderDelivered(user.email, profile.firstName, order.orderNumber)
          .catch((err) => console.error("Error sending delivery email:", err));
      }
    }

    io.to("admin-room").emit("shipping-status-updated", {
      shippingId: shipping._id,
      orderId: shipping.orderId,
      orderNumber: order?.orderNumber,
      status,
      oldStatus,
      driverName: shipping.driverName,
      driverPhone: shipping.driverPhone,
    });

    try {
      await notificationService.createForAdmins({
        type: 'admin-shipping-status-updated',
        title: 'Shipping Status Updated',
        message: `Shipping status for order #${order?.orderNumber} changed from ${oldStatus} to ${status}`,
        data: {
          shippingId: shipping._id,
          orderId: shipping.orderId,
          orderNumber: order?.orderNumber,
          oldStatus,
          newStatus: status,
          trackingNumber: shipping.trackingNumber,
          driverName: shipping.driverName,
          driverPhone: shipping.driverPhone,
          updatedBy: adminId,
          customerId: user?._id,
          customerName: profile ? `${profile.firstName} ${profile.lastName}` : 'Customer'
        },
        link: `/dashboards/admin/orders/${order?._id}/shipping`
      });
      
    } catch (notifErr) {
      console.error('Failed to create admin shipping status notification:', notifErr);
    }

    return shipping;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const markShippingAsPaid = async (
  shippingId: string,
  invoiceId: string,
): Promise<IShipping> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shipping = await Shipping.findById(shippingId).session(session);
    if (!shipping) {
      throw new Error("Shipping not found");
    }

    shipping.isPaid = true;
    shipping.shippingInvoiceId = new mongoose.Types.ObjectId(invoiceId);
    await shipping.save({ session });
    await session.commitTransaction();

    const order = await Order.findById(shipping.orderId);
    const user = await User.findById(order?.userId);
    const profile = await Profile.findOne({ userId: order?.userId });

    if (user && order) {
      // FIXED: Add email for shipping payment confirmation
      if (profile) {
        await emailService
          .sendPaymentConfirmation(
            user.email,
            profile.firstName,
            order.orderNumber,
            shipping.shippingCost || 0,
            "full",
            "Bank Transfer or Paystack",
            0,
          )
          .catch((err) => console.error("Error sending shipping payment email:", err));
      }

      try {
        await notificationService.createForUser(user._id, {
          type: 'shipping-paid',
          title: 'Shipping Payment Received',
          message: `Your shipping payment for order #${order.orderNumber} has been received.`,
          data: {
            shippingId: shipping._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            invoiceId,
            cost: shipping.shippingCost
          },
          link: `/orders/${order._id}`
        });

        await notificationService.createForAdmins({
          type: 'admin-shipping-paid',
          title: 'Shipping Payment Received',
          message: `Shipping payment of ₦${(shipping.shippingCost ?? 0).toLocaleString()} received for order #${order.orderNumber}`,
          data: {
            shippingId: shipping._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            invoiceId,
            cost: shipping.shippingCost,
            customerId: user._id,
            customerName: profile ? `${profile.firstName} ${profile.lastName}` : 'Customer'
          },
          link: `/dashboards/admin/orders/${order._id}/shipping`
        });
        
      } catch (notifErr) {
        console.error('Failed to create shipping paid notifications:', notifErr);
      }
    }

    return shipping;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getShippingById = async (
  shippingId: string,
  userId: string,
  userRole: string,
): Promise<IShipping | null> => {
  const shipping = await Shipping.findById(shippingId)
    .populate({
      path: "orderId",
      select: "orderNumber userId status totalAmount",
      populate: {
        path: "userId",
        select: "email",
      }
    });

  if (!shipping) {
    throw new Error("Shipping not found");
  }

  const order = shipping.orderId as any;

  if (userRole === "Customer" && order.userId._id.toString() !== userId) {
    throw new Error("Unauthorized to view this shipping");
  }

  return shipping;
};

export const getShippingByOrderId = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<IShipping | null> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  if (userRole === "Customer" && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this shipping");
  }

  const shipping = await Shipping.findOne({ orderId }).populate({
    path: "orderId",
    populate: {
      path: "userId",
      model: "User",
      select: "email"
    }
  });

  return shipping;
};

export const getAllShipping = async (
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedShipping> => {
  const skip = (page - 1) * limit;

  const [shipping, total] = await Promise.all([
    Shipping.find()
      .populate({
        path: "orderId",
        populate: {
          path: "userId",
          model: "User",
          select: "email"
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Shipping.countDocuments(),
  ]);

  return {
    shipping,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

export const filterShipping = async (
  filters: IShippingFilter,
): Promise<PaginatedShipping> => {
  const {
    status,
    method,
    orderId,
    userId,
    isPaid,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = filters;

  const query: any = {};

  if (status) query.status = status;
  if (method) query.shippingMethod = method;
  if (orderId) query.orderId = new mongoose.Types.ObjectId(orderId);
  if (isPaid !== undefined) query.isPaid = isPaid;

  if (userId) {
    const orders = await Order.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).select("_id");
    const orderIds = orders.map((o) => o._id);
    query.orderId = { $in: orderIds };
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const skip = (page - 1) * limit;

  const [shipping, total] = await Promise.all([
    Shipping.find(query)
      .populate({
        path: "orderId",
        populate: {
          path: "userId",
          model: "User",
          select: "email"
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Shipping.countDocuments(query),
  ]);

  return {
    shipping,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

export const getShippingNeedingInvoice = async (): Promise<IShipping[]> => {
  return Shipping.find({
    shippingInvoiceId: { $exists: false },
    isPaid: false,
  })
    .populate("orderId", "orderNumber userId")
    .sort({ createdAt: 1 })
    .exec();
};

export const getPendingShipping = async (): Promise<IShipping[]> => {
  return Shipping.find({
    status: ShippingStatus.Pending,
  })
    .populate("orderId", "orderNumber userId")
    .sort({ createdAt: 1 })
    .exec();
};