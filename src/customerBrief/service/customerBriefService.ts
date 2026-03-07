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

    // Customer can only submit briefs when order is in these statuses
    if (
      order.status !== OrderStatus.Pending &&
      order.status !== OrderStatus.OrderReceived
    ) {
      throw new Error(
        "Customer brief can only be created for orders that are Pending or Order Received",
      );
    }

    // Update order status to FilesUploaded when customer submits first brief
    if (order.status === OrderStatus.OrderReceived) {
      order.status = OrderStatus.FilesUploaded;
      await order.save();
    }
  } else if (userRole === UserRole.Admin || userRole === UserRole.SuperAdmin) {
    briefRole = userRole === UserRole.Admin 
      ? CustomerBriefRole.Admin 
      : CustomerBriefRole.SuperAdmin;

    // When admin responds, don't change order status yet
    // The order will move to AwaitingInvoice when ALL products are ready
  } else {
    throw new Error("Invalid user role");
  }

  // Save or update the brief
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
      viewed: false,
    });
    savedBrief = await newBrief.save();
  }

  // Emit socket events
  if (userRole === UserRole.Customer) {
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

    // After admin responds, check if the order is ready for invoice
    await checkOrderReadyForInvoice(order._id.toString(), io);
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

  // Notify everyone
  io.to("admin-room").emit("brief-deleted", {
    briefId: brief._id,
    orderId: brief.orderId,
    orderNumber: order.orderNumber,
    productId: brief.productId,
    role: brief.role,
    message: `Brief deleted`,
    timestamp: new Date(),
  });

  io.to(`user-${order.userId}`).emit("brief-deleted", {
    briefId: brief._id,
    orderId: brief.orderId,
    orderNumber: order.orderNumber,
    productId: brief.productId,
    role: brief.role,
    message: `A brief was deleted`,
    timestamp: new Date(),
  });

  await brief.deleteOne();

  // After deleting, check if the order is ready for invoice
  await checkOrderReadyForInvoice(order._id.toString(), io);

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
    status?: 'pending' | 'responded' | 'viewed' | 'all';
    hasFiles?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{
  briefs: any[];
  total: number;
  page: number;
  pages: number;
}> => {
  const { status, hasFiles, search, page = 1, limit = 10 } = filters;

  // Build the query for customer briefs
  const query: any = {
    role: CustomerBriefRole.Customer,
  };

  // Apply hasFiles filter
  if (hasFiles) {
    query.$or = [
      { image: { $exists: true, $ne: null } },
      { voiceNote: { $exists: true, $ne: null } },
      { video: { $exists: true, $ne: null } },
      { logo: { $exists: true, $ne: null } }
    ];
  }

  // Apply search filter
  if (search && search.trim()) {
    const searchRegex = new RegExp(search, 'i');
    
    // Find matching orders by order number
    const matchingOrders = await Order.find({
      orderNumber: searchRegex
    }).select('_id');
    
    const orderIds = matchingOrders.map(o => o._id);

    // Find matching products by name
    const matchingProducts = await Product.find({
      name: searchRegex
    }).select('_id');
    
    const productIds = matchingProducts.map(p => p._id);

    // Build search query
    query.$or = [
      { description: searchRegex },
      { orderId: { $in: orderIds } },
      { productId: { $in: productIds } }
    ];
  }

  // Get all customer briefs with the base query
  const customerBriefs = await CustomerBrief.find(query)
    .populate({
      path: "orderId",
      select: "orderNumber userId status",
      populate: { path: "userId", select: "email" }
    })
    .populate("productId", "name")
    .sort({ createdAt: -1 })
    .lean();

  // For each brief, determine its status
  const briefsWithStatus = await Promise.all(
    customerBriefs.map(async (brief) => {
      // Check if there's an admin response for this order/product
      const adminResponse = await CustomerBrief.findOne({
        orderId: brief.orderId._id,
        productId: brief.productId._id,
        role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] }
      }).sort({ createdAt: -1 });

      // Check if brief has files
      const hasFiles = !!(brief.image || brief.voiceNote || brief.video || brief.logo);

      // Determine status
      let briefStatus = 'pending';
      
      if (brief.viewed) {
        briefStatus = 'viewed';
      } else if (adminResponse) {
        // Check if admin response is the most recent
        const lastAdminDate = new Date(adminResponse.createdAt);
        const lastCustomerDate = new Date(brief.createdAt);
        
        if (lastAdminDate > lastCustomerDate) {
          briefStatus = 'responded';
        }
      }

      return {
        ...brief,
        hasAdminResponse: !!adminResponse,
        hasFiles,
        status: briefStatus
      };
    })
  );

  // Filter by status
  let filteredBriefs = briefsWithStatus;
  if (status && status !== 'all') {
    filteredBriefs = briefsWithStatus.filter(b => b.status === status);
  }

  // Paginate
  const skip = (page - 1) * limit;
  const paginatedBriefs = filteredBriefs.slice(skip, skip + limit);

  return {
    briefs: paginatedBriefs,
    total: filteredBriefs.length,
    page,
    pages: Math.ceil(filteredBriefs.length / limit),
  };
};

// ==================== MARK BRIEF AS VIEWED ====================
export const markBriefAsViewed = async (
  briefId: string,
  userId: string,
  userRole: string,
  io?: Server,
): Promise<ICustomerBrief> => {
  const brief = await CustomerBrief.findById(briefId);
  
  if (!brief) {
    throw new Error("Brief not found");
  }

  // Only admins and super admins can mark as viewed
  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized");
  }

  brief.viewed = true;
  brief.viewedAt = new Date();
  
  await brief.save();

  // After marking as viewed, check if the order is ready for invoice
  if (io) {
    await checkOrderReadyForInvoice(brief.orderId.toString(), io);
  }

  return brief;
};

// ==================== CHECK IF ORDER IS READY FOR INVOICE ====================
export const checkOrderReadyForInvoice = async (
  orderId: string,
  io?: Server,
): Promise<boolean> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  // If order already has invoice or is beyond awaiting invoice, don't change
  if (order.invoiceId || order.status !== OrderStatus.FilesUploaded) {
    return false;
  }

  // Get all products in this order
  const productIds = order.items.map(item => item.productId.toString());
  
  // Get all briefs for this order
  const briefs = await CustomerBrief.find({ 
    orderId: orderId,
    role: CustomerBriefRole.Customer 
  });

  // If there are no briefs, order is ready (no customization needed)
  if (briefs.length === 0) {
    order.status = OrderStatus.AwaitingInvoice;
    await order.save();
    
    // Emit socket event
    if (io) {
      io.to("superadmin-room").emit("order-ready-for-invoice", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Order ready for invoice"
      });
    }
    
    return true;
  }

  // For each product, check if it's ready
  let allProductsReady = true;
  
  for (const productId of productIds) {
    const productBriefs = briefs.filter(b => b.productId.toString() === productId);
    
    if (productBriefs.length === 0) {
      // No brief for this product - it's ready
      continue;
    }
    
    // Get the latest brief for this product
    const latestBrief = productBriefs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    // Check if there's an admin response newer than the customer's latest
    const adminResponse = await CustomerBrief.findOne({
      orderId: orderId,
      productId: productId,
      role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
      createdAt: { $gt: latestBrief.createdAt }
    });

    // Product is ready if:
    // 1. The latest customer brief is viewed, OR
    // 2. There's an admin response after the latest customer brief
    const isReady = latestBrief.viewed || !!adminResponse;
    
    if (!isReady) {
      allProductsReady = false;
      break;
    }
  }

  // If all products are ready, update order status to AwaitingInvoice
  if (allProductsReady) {
    order.status = OrderStatus.AwaitingInvoice;
    await order.save();
    
    // Emit socket event
    if (io) {
      io.to("superadmin-room").emit("order-ready-for-invoice", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Order ready for invoice"
      });
    }
  }

  return allProductsReady;
};

// ==================== GET BRIEF STATUS FOR ORDER ====================
export const getOrderBriefStatus = async (orderId: string): Promise<any> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const productIds = order.items.map(item => item.productId.toString());
  const briefs = await CustomerBrief.find({ orderId: orderId })
    .populate("productId", "name")
    .sort({ createdAt: -1 });

  const productStatus = [];

  for (const productId of productIds) {
    const productBriefs = briefs.filter(b => b.productId.toString() === productId);
    const product = order.items.find(i => i.productId.toString() === productId);
    
    let status = 'no-brief';
    let lastMessage = null;
    let viewed = false;

    if (productBriefs.length > 0) {
      const latestCustomerBrief = productBriefs
        .filter(b => b.role === CustomerBriefRole.Customer)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      const latestAdminBrief = productBriefs
        .filter(b => b.role === CustomerBriefRole.Admin || b.role === CustomerBriefRole.SuperAdmin)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (latestCustomerBrief) {
        viewed = latestCustomerBrief.viewed || false;
        
        if (latestAdminBrief && new Date(latestAdminBrief.createdAt) > new Date(latestCustomerBrief.createdAt)) {
          status = 'responded';
          lastMessage = 'admin';
        } else if (viewed) {
          status = 'viewed';
          lastMessage = 'customer';
        } else {
          status = 'pending';
          lastMessage = 'customer';
        }
      }
    }

    productStatus.push({
      productId,
      productName: product?.productName || 'Unknown',
      status,
      viewed,
      briefCount: productBriefs.length,
      lastMessage
    });
  }

  const allProductsReady = productStatus.every(p => 
    p.status === 'responded' || p.status === 'viewed' || p.status === 'no-brief'
  );

  return {
    orderId,
    orderNumber: order.orderNumber,
    currentStatus: order.status,
    allProductsReady,
    productStatus
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