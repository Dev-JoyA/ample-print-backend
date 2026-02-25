import {
  ICustomerBrief,
  CreateCustomerBriefDTO,
  CustomerBrief,
  CustomerBriefRole,
} from "../model/customerBrief.js";
import { Order, OrderStatus } from "../../order/model/orderModel.js";
import { Product } from "../../product/model/productModel.js";
import { Types } from "mongoose";
import { User, UserRole } from "../../users/model/userModel.js";
import { Server } from "socket.io";

export const createOrUpdateCustomerBrief = async (
  brief: CreateCustomerBriefDTO,
  userId: string,
  userRole: string,
  io: Server,
): Promise<ICustomerBrief> => {
  const order = await Order.findById(brief.orderId).exec();
  if (!order) {
    throw new Error("Order not found for the provided orderId");
  }

  const product = await Product.findById(brief.productId).exec();
  if (!product) {
    throw new Error("Product not found for the provided productId");
  }

  const hasContent =
    brief.description ||
    brief.image ||
    brief.voiceNote ||
    brief.video ||
    brief.logo;
  if (!hasContent) {
    throw new Error(
      "Customer brief must contain at least one customization detail",
    );
  }

  let briefRole: CustomerBriefRole;
  if (userRole === UserRole.Customer) {
    briefRole = CustomerBriefRole.Customer;

    if (
      order.status !== OrderStatus.Pending &&
      order.status !== OrderStatus.OrderReceived
    ) {
      throw new Error(
        "Customer brief can only be created for orders that are Pending or Order Received",
      );
    }
  } else if (userRole === UserRole.Admin) {
    briefRole = CustomerBriefRole.Admin;

    const customerBrief = await CustomerBrief.findOne({
      orderId: brief.orderId,
      productId: brief.productId,
      role: CustomerBriefRole.Customer,
    });

    if (!customerBrief) {
      throw new Error(
        "Customer must submit a brief first before admin can respond",
      );
    }
  } else if (userRole === UserRole.SuperAdmin) {
    briefRole = CustomerBriefRole.SuperAdmin;
  } else {
    throw new Error("Invalid user role");
  }

  const existingBrief = await CustomerBrief.findOne({
    orderId: brief.orderId,
    productId: brief.productId,
    role: briefRole,
  });

  let savedBrief: ICustomerBrief;

  if (existingBrief) {
    Object.assign(existingBrief, {
      description: brief.description,
      image: brief.image,
      voiceNote: brief.voiceNote,
      video: brief.video,
      logo: brief.logo,
      designId: brief.designId,
    });
    savedBrief = await existingBrief.save();
  } else {
    const newBrief = new CustomerBrief({
      ...brief,
      role: briefRole,
    });
    savedBrief = await newBrief.save();
  }

  if (userRole === UserRole.Customer) {
    order.status = OrderStatus.FilesUploaded;
    await order.save();

    io.to("admin-room").emit("new-customer-brief", {
      briefId: savedBrief._id,
      orderId: savedBrief.orderId,
      orderNumber: order.orderNumber,
      productId: savedBrief.productId,
      message: `New customization request from customer`,
      timestamp: new Date(),
    });

    io.to("superadmin-room").emit("new-customer-brief", {
      briefId: savedBrief._id,
      orderId: savedBrief.orderId,
      orderNumber: order.orderNumber,
      productId: savedBrief.productId,
      message: `New customization request from customer`,
      timestamp: new Date(),
    });
  } else if (userRole === UserRole.Admin || userRole === UserRole.SuperAdmin) {
    order.status = OrderStatus.DesignUploaded;
    await order.save();

    // ===== NOTIFY CUSTOMER =====
    io.to(`user-${order.userId}`).emit("admin-brief-response", {
      briefId: savedBrief._id,
      orderId: savedBrief.orderId,
      orderNumber: order.orderNumber,
      productId: savedBrief.productId,
      role: userRole,
      message: `Admin has responded to your customization request`,
      hasDesign: !!savedBrief.designId,
      timestamp: new Date(),
    });
  }

  return savedBrief;
};

export const deleteCustomerBrief = async (
  briefId: string,
  userId: string,
  userRole: string,
  io: Server,
): Promise<{ message: string }> => {
  if (!Types.ObjectId.isValid(briefId)) {
    throw new Error("Invalid brief ID format");
  }

  const brief = await CustomerBrief.findById(briefId);
  if (!brief) {
    throw new Error("Customer brief not found");
  }

  const order = await Order.findById(brief.orderId);
  if (!order) {
    throw new Error("Associated order not found");
  }

  if (userRole === UserRole.Customer) {
    if (brief.role !== CustomerBriefRole.Customer) {
      throw new Error("Customers can only delete their own briefs");
    }

    if (order.userId.toString() !== userId) {
      throw new Error("Unauthorized to delete this brief");
    }

    const allowedStatuses = [
      OrderStatus.Pending,
      OrderStatus.OrderReceived,
      OrderStatus.FilesUploaded,
    ];
    if (!allowedStatuses.includes(order.status)) {
      throw new Error(
        `Cannot delete brief when order is in ${order.status} status`,
      );
    }
  } else if (userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized to delete this brief");
  }

  // ===== NOTIFY EVERYONE =====
  io.to("admin-room").emit("brief-deleted", {
    briefId: brief._id,
    orderId: brief.orderId,
    orderNumber: order.orderNumber,
    productId: brief.productId,
    role: brief.role,
    message: `Super admin deleted a brief`,
    timestamp: new Date(),
  });

  io.to(`user-${order.userId}`).emit("brief-deleted", {
    briefId: brief._id,
    orderId: brief.orderId,
    orderNumber: order.orderNumber,
    productId: brief.productId,
    role: brief.role,
    message: `A brief was deleted by super admin`,
    timestamp: new Date(),
  });

  await brief.deleteOne();

  return { message: `${brief.role} brief deleted successfully` };
};

export const getCustomerBriefById = async (
  briefId: string,
  userId: string,
  userRole: string,
): Promise<ICustomerBrief | null> => {
  if (!Types.ObjectId.isValid(briefId)) {
    throw new Error("Invalid brief ID format");
  }

  const brief = await CustomerBrief.findById(briefId)
    .populate("orderId", "orderNumber status userId totalAmount")
    .populate("productId", "name price dimensions mainImage")
    .populate("designId", "designUrl filename status")
    .exec();

  if (!brief) return null;

  const order = brief.orderId as any;
  if (userRole === UserRole.Customer && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this brief");
  }

  return brief;
};

export const getUserCustomerBriefs = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
): Promise<{
  briefs: ICustomerBrief[];
  total: number;
  page: number;
  pages: number;
}> => {
  const orders = await Order.find({ userId: new Types.ObjectId(userId) })
    .select("_id")
    .exec();

  const orderIds = orders.map((order) => order._id);

  const skip = (page - 1) * limit;

  const [briefs, total] = await Promise.all([
    CustomerBrief.find({
      orderId: { $in: orderIds },
      role: CustomerBriefRole.Customer,
    })
      .populate("orderId", "orderNumber status createdAt")
      .populate("productId", "name price mainImage")
      .populate("designId", "designUrl status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    CustomerBrief.countDocuments({
      orderId: { $in: orderIds },
      role: CustomerBriefRole.Customer,
    }),
  ]);

  return {
    briefs,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

export const getCustomerBriefByOrderId = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<{
  customer?: ICustomerBrief | null;
  admin?: ICustomerBrief | null;
  superAdmin?: ICustomerBrief | null;
}> => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order ID format");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  if (userRole === UserRole.Customer && order.userId.toString() !== userId) {
    throw new Error("Unauthorized to view this order's briefs");
  }

  const briefs = await CustomerBrief.find({
    orderId: new Types.ObjectId(orderId),
  })
    .populate("productId", "name price mainImage")
    .populate("designId", "designUrl filename status")
    .sort({ createdAt: 1 })
    .exec();

  return {
    customer: briefs.find((b) => b.role === CustomerBriefRole.Customer),
    admin: briefs.find((b) => b.role === CustomerBriefRole.Admin),
    superAdmin: briefs.find((b) => b.role === CustomerBriefRole.SuperAdmin),
  };
};

export const getAdminCustomerBriefs = async (
  adminId: string,
  filters: {
    status?: OrderStatus;
    hasResponded?: boolean;
    page?: number;
    limit?: number;
  } = {},
): Promise<{
  briefs: any[];
  total: number;
  page: number;
  pages: number;
}> => {
  const { status, hasResponded, page = 1, limit = 10 } = filters;

  const orderQuery: any = {};
  if (status) {
    orderQuery.status = status;
  }

  const orders = await Order.find(orderQuery).select("_id userId");
  const orderIds = orders.map((o) => o._id);

  const customerBriefs = await CustomerBrief.find({
    orderId: { $in: orderIds },
    role: CustomerBriefRole.Customer,
  }).select("orderId");

  const orderIdsWithCustomerBrief = customerBriefs.map((cb) => cb.orderId);

  const adminBriefs = await CustomerBrief.find({
    orderId: { $in: orderIdsWithCustomerBrief },
    role: CustomerBriefRole.Admin,
  }).select("orderId");

  const orderIdsWithAdminResponse = adminBriefs.map((ab) =>
    ab.orderId.toString(),
  );

  let finalOrderIds = orderIdsWithCustomerBrief.map((id) => id.toString());

  if (hasResponded !== undefined) {
    if (hasResponded) {
      finalOrderIds = finalOrderIds.filter((id) =>
        orderIdsWithAdminResponse.includes(id),
      );
    } else {
      finalOrderIds = finalOrderIds.filter(
        (id) => !orderIdsWithAdminResponse.includes(id),
      );
    }
  }

  const skip = (page - 1) * limit;

  const [briefs, total] = await Promise.all([
    CustomerBrief.find({
      orderId: { $in: finalOrderIds.map((id) => new Types.ObjectId(id)) },
      role: CustomerBriefRole.Customer,
    })
      .populate({
        path: "orderId",
        populate: { path: "userId", select: "fullname email" },
      })
      .populate("productId", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    finalOrderIds.length,
  ]);

  const briefsWithStatus = briefs.map((brief) => {
    const hasAdminResponse = orderIdsWithAdminResponse.includes(
      brief.orderId.toString(),
    );
    return {
      ...brief.toObject(),
      needsAdminResponse: !hasAdminResponse,
      hasAdminResponse,
    };
  });

  return {
    briefs: briefsWithStatus,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

export const filterCustomerBriefs = async (
  filters: {
    orderId?: string;
    productId?: string;
    role?: CustomerBriefRole;
    hasDesign?: boolean;
    startDate?: Date;
    endDate?: Date;
    searchTerm?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
  userRole: string,
): Promise<{
  briefs: ICustomerBrief[];
  total: number;
  page: number;
  pages: number;
}> => {
  if (userRole === UserRole.Customer) {
    throw new Error("Unauthorized to access this resource");
  }

  const {
    orderId,
    productId,
    role,
    hasDesign,
    startDate,
    endDate,
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const query: any = {};

  if (orderId && Types.ObjectId.isValid(orderId)) {
    query.orderId = new Types.ObjectId(orderId);
  }

  if (productId && Types.ObjectId.isValid(productId)) {
    query.productId = new Types.ObjectId(productId);
  }

  if (role) {
    query.role = role;
  }

  if (hasDesign !== undefined) {
    if (hasDesign) {
      query.designId = { $ne: null };
    } else {
      query.designId = null;
    }
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  if (searchTerm) {
    query.$or = [{ description: { $regex: searchTerm, $options: "i" } }];
  }

  const skip = (page - 1) * limit;
  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

  const [briefs, total] = await Promise.all([
    CustomerBrief.find(query)
      .populate({
        path: "orderId",
        populate: { path: "userId", select: "fullname email" },
      })
      .populate("productId", "name price")
      .populate("designId", "designUrl status")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec(),
    CustomerBrief.countDocuments(query),
  ]);

  return {
    briefs,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

export const checkAdminResponseStatus = async (
  orderId: string,
  productId: string,
): Promise<{
  hasAdminResponded: boolean;
  adminBrief?: ICustomerBrief | null;
  customerBrief?: ICustomerBrief | null;
}> => {
  const [customerBrief, adminBrief] = await Promise.all([
    CustomerBrief.findOne({
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(productId),
      role: CustomerBriefRole.Customer,
    }),
    CustomerBrief.findOne({
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(productId),
      role: CustomerBriefRole.Admin,
    }),
  ]);

  return {
    hasAdminResponded: !!adminBrief,
    adminBrief,
    customerBrief,
  };
};

export const getProductBriefAnalytics = async (
  productId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  totalBriefs: number;
  customerBriefs: number;
  adminResponses: number;
  completionRate: number;
}> => {
  const dateQuery: any = {};
  if (startDate || endDate) {
    dateQuery.createdAt = {};
    if (startDate) dateQuery.createdAt.$gte = startDate;
    if (endDate) dateQuery.createdAt.$lte = endDate;
  }

  const [totalBriefs, customerBriefs, adminResponses] = await Promise.all([
    CustomerBrief.countDocuments({
      productId: new Types.ObjectId(productId),
      ...dateQuery,
    }),
    CustomerBrief.countDocuments({
      productId: new Types.ObjectId(productId),
      role: CustomerBriefRole.Customer,
      ...dateQuery,
    }),
    CustomerBrief.countDocuments({
      productId: new Types.ObjectId(productId),
      role: CustomerBriefRole.Admin,
      ...dateQuery,
    }),
  ]);

  return {
    totalBriefs,
    customerBriefs,
    adminResponses,
    completionRate:
      customerBriefs > 0 ? (adminResponses / customerBriefs) * 100 : 0,
  };
};
