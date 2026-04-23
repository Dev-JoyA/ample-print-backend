import {
  ICustomerBrief,
  CreateCustomerBriefDTO,
  CustomerBrief,
  CustomerBriefRole,
  CustomerBriefStatus,
} from "../model/customerBrief.js";
import { Order, OrderStatus } from "../../order/model/orderModel.js";
import { Product } from "../../product/model/productModel.js";
import { Types } from "mongoose";
import { User, UserRole } from "../../users/model/userModel.js";
import { Server } from "socket.io";
import { notificationService } from "../../notification/service/notificationService.js";

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
  let briefStatus: CustomerBriefStatus;

  if (userRole === UserRole.Customer) {
    briefRole = CustomerBriefRole.Customer;
    briefStatus = CustomerBriefStatus.Pending;

    if (
      order.status !== OrderStatus.Pending &&
      order.status !== OrderStatus.OrderReceived &&
      order.status !== OrderStatus.FilesUploaded
    ) {
      throw new Error(
        "Customer brief can only be created for orders that are Pending or Order Received or Files Uploaded",
      );
    }

    if (order.status === OrderStatus.OrderReceived) {
      order.status = OrderStatus.FilesUploaded;
      await order.save();
    }
  } else if (userRole === UserRole.Admin || userRole === UserRole.SuperAdmin) {
    briefRole =
      userRole === UserRole.Admin
        ? CustomerBriefRole.Admin
        : CustomerBriefRole.SuperAdmin;
    briefStatus = CustomerBriefStatus.Responded;

    const previousCustomerBrief = await CustomerBrief.findOne({
      orderId: brief.orderId,
      productId: brief.productId,
      role: CustomerBriefRole.Customer,
    }).sort({ createdAt: -1 });

    if (
      previousCustomerBrief &&
      previousCustomerBrief.status !== CustomerBriefStatus.Complete
    ) {
      previousCustomerBrief.status = CustomerBriefStatus.Responded;
      await previousCustomerBrief.save();
    }
  } else {
    throw new Error("Invalid user role");
  }

  const savedBrief = new CustomerBrief({
    orderId: brief.orderId,
    productId: brief.productId,
    role: briefRole,
    description: brief.description,
    designId: brief.designId,
    image: brief.image,
    voiceNote: brief.voiceNote,
    video: brief.video,
    logo: brief.logo,
    viewed: false,
    viewedAt: null,
    status: briefStatus,
  });

  await savedBrief.save();

  if (userRole === UserRole.Customer) {
    io.to("admin-room").emit("new-customer-brief", {
      briefId: savedBrief._id,
      orderId: savedBrief.orderId,
      orderNumber: order.orderNumber,
      productId: savedBrief.productId,
      productName: product.name,
      message: `New customization request from customer`,
      timestamp: new Date(),
    });

    io.to("superadmin-room").emit("new-customer-brief", {
      briefId: savedBrief._id,
      orderId: savedBrief.orderId,
      orderNumber: order.orderNumber,
      productId: savedBrief.productId,
      productName: product.name,
      message: `New customization request from customer`,
      timestamp: new Date(),
    });

    try {
      await notificationService.createForAdmins({
        type: "new-customer-brief",
        title: "New Customization Request",
        message: `Customer submitted a brief for ${product.name} (order #${order.orderNumber})`,
        data: {
          briefId: savedBrief._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: product._id,
          productName: product.name,
          customerId: userId,
          hasFiles: {
            image: !!brief.image,
            voiceNote: !!brief.voiceNote,
            video: !!brief.video,
            logo: !!brief.logo,
          },
        },
        link: `/dashboards/admin/customer-briefs/${savedBrief._id}`,
      });
    } catch (notifErr) {
      console.error("Failed to create new brief notification:", notifErr);
    }
  } else if (userRole === UserRole.Admin || userRole === UserRole.SuperAdmin) {
    io.to(`user-${order.userId}`).emit("admin-brief-response", {
      briefId: savedBrief._id,
      orderId: savedBrief.orderId,
      orderNumber: order.orderNumber,
      productId: savedBrief.productId,
      productName: product.name,
      role: userRole,
      message: `Admin has responded to your customization request`,
      hasDesign: !!savedBrief.designId,
      timestamp: new Date(),
    });

    try {
      await notificationService.createForUser(order.userId, {
        type: "admin-brief-response",
        title: "Response to Your Customization Request",
        message: `Admin responded to your brief for ${product.name} (order #${order.orderNumber})`,
        data: {
          briefId: savedBrief._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: product._id,
          productName: product.name,
          hasDesign: !!savedBrief.designId,
          respondedBy: userId,
          responderRole: userRole,
        },
        link: `/orders/${order._id}/products/${product._id}/briefs`,
      });

      await notificationService.createForAdmins({
        type: "admin-brief-responded",
        title: "Admin Responded to Brief",
        message: `${userRole === UserRole.Admin ? "Admin" : "Super Admin"} responded to brief for ${product.name} (order #${order.orderNumber})`,
        data: {
          briefId: savedBrief._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: product._id,
          productName: product.name,
          respondedBy: userId,
          responderRole: userRole,
          hasDesign: !!savedBrief.designId,
        },
        link: `/dashboards/admin/customer-briefs/${savedBrief._id}`,
      });
    } catch (notifErr) {
      console.error("Failed to create admin response notification:", notifErr);
    }

    await checkOrderReadyForInvoice(order._id.toString(), io);
  }

  return savedBrief;
};

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

  if (brief.viewed) {
    return brief;
  }

  const order = await Order.findById(brief.orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const isOrderOwner = order.userId.toString() === userId;
  const isAdmin =
    userRole === UserRole.Admin || userRole === UserRole.SuperAdmin;

  if (userRole === UserRole.Customer) {
    if (
      brief.role !== CustomerBriefRole.Admin &&
      brief.role !== CustomerBriefRole.SuperAdmin
    ) {
      throw new Error("Customers can only mark admin responses as viewed");
    }
    if (!isOrderOwner) {
      throw new Error("You can only mark briefs from your own orders");
    }

    brief.viewed = true;
    brief.viewedAt = new Date();
    brief.status = CustomerBriefStatus.Complete;
    await brief.save();
  } else if (isAdmin) {
    if (brief.role !== CustomerBriefRole.Customer) {
      throw new Error("Admins can only mark customer briefs as viewed");
    }

    brief.adminViewed = true;
    brief.adminViewedAt = new Date();
    brief.status = CustomerBriefStatus.Complete;
    await brief.save();
  } else {
    throw new Error("Unauthorized");
  }

  if (io) {
    await checkOrderReadyForInvoice(brief.orderId.toString(), io);
  }

  await checkAndUpdateOrderStatus(order._id.toString(), io);
  return brief;
};

export const markBriefAsViewedByAdmin = async (
  briefId: string,
  adminId: string,
  userRole: string,
  io?: Server,
): Promise<ICustomerBrief> => {
  if (!Types.ObjectId.isValid(briefId)) {
    throw new Error("Invalid brief ID format");
  }

  const brief = await CustomerBrief.findById(briefId);

  if (!brief) {
    throw new Error("Brief not found");
  }

  const order = await Order.findById(brief.orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
    throw new Error("Unauthorized: Only admins can mark briefs as viewed");
  }

  if (brief.role !== CustomerBriefRole.Customer) {
    throw new Error("Only customer briefs can be marked as viewed by admin");
  }

  if (brief.adminViewed) {
    return brief;
  }

  brief.adminViewed = true;
  brief.adminViewedAt = new Date();
  brief.status = CustomerBriefStatus.Complete;
  await brief.save();

  await checkAndUpdateOrderStatus(order._id.toString(), io);
  return brief;
};

export const customerReplyToAdmin = async (
  brief: CreateCustomerBriefDTO,
  userId: string,
  userRole: string,
  io: Server,
): Promise<ICustomerBrief> => {
  const order = await Order.findById(brief.orderId).exec();
  if (!order) {
    throw new Error("Order not found");
  }

  const product = await Product.findById(brief.productId).exec();
  if (!product) {
    throw new Error("Product not found");
  }

  const hasContent =
    brief.description ||
    brief.image ||
    brief.voiceNote ||
    brief.video ||
    brief.logo;
  if (!hasContent) {
    throw new Error("Reply must contain at least one customization detail");
  }

  const previousAdminBrief = await CustomerBrief.findOne({
    orderId: brief.orderId,
    productId: brief.productId,
    role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
  }).sort({ createdAt: -1 });

  if (
    previousAdminBrief &&
    previousAdminBrief.status !== CustomerBriefStatus.Complete
  ) {
    previousAdminBrief.status = CustomerBriefStatus.Pending;
    await previousAdminBrief.save();
  }

  const savedBrief = new CustomerBrief({
    orderId: brief.orderId,
    productId: brief.productId,
    role: CustomerBriefRole.Customer,
    description: brief.description,
    image: brief.image,
    voiceNote: brief.voiceNote,
    video: brief.video,
    logo: brief.logo,
    viewed: false,
    viewedAt: null,
    status: CustomerBriefStatus.Pending,
  });

  await savedBrief.save();

  io.to("admin-room").emit("new-customer-brief", {
    briefId: savedBrief._id,
    orderId: savedBrief.orderId,
    orderNumber: order.orderNumber,
    productId: savedBrief.productId,
    productName: product.name,
    message: `Customer replied to admin response`,
    timestamp: new Date(),
  });

  io.to("superadmin-room").emit("new-customer-brief", {
    briefId: savedBrief._id,
    orderId: savedBrief.orderId,
    orderNumber: order.orderNumber,
    productId: savedBrief.productId,
    productName: product.name,
    message: `Customer replied to admin response`,
    timestamp: new Date(),
  });

  return savedBrief;
};

export const checkOrderReadyForInvoice = async (
  orderId: string,
  io?: Server,
): Promise<boolean> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.invoiceId || order.status !== OrderStatus.FilesUploaded) {
    return false;
  }

  const productIds = order.items.map((item) => item.productId.toString());

  let allProductsComplete = true;

  for (const productId of productIds) {
    const latestBrief = await CustomerBrief.findOne({
      orderId: orderId,
      productId: productId,
    }).sort({ createdAt: -1 });

    if (!latestBrief || latestBrief.status !== CustomerBriefStatus.Complete) {
      allProductsComplete = false;
      break;
    }
  }

  if (allProductsComplete && order.status === OrderStatus.FilesUploaded) {
    order.status = OrderStatus.AwaitingInvoice;
    await order.save();

    if (io) {
      io.to("superadmin-room").emit("order-ready-for-invoice", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Order ready for invoice",
      });
    }

    try {
      await notificationService.createForSuperAdmins({
        type: "order-ready-for-invoice",
        title: "Order Ready for Invoice",
        message: `Order #${order.orderNumber} is ready for invoice generation`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          itemCount: order.items.length,
          productIds: productIds,
        },
        link: `/dashboards/super-admin/invoices/ready?order=${order._id}`,
      });
    } catch (notifErr) {
      console.error("Failed to create order ready notification:", notifErr);
    }
  }

  return allProductsComplete;
};

export const getCustomerPendingBriefResponses = async (
  userId: string,
): Promise<any[]> => {
  // Get all user's order IDs first
  const userOrders = await Order.find({ userId: new Types.ObjectId(userId) })
    .select("_id")
    .lean();

  const orderIds = userOrders.map((order) => order._id);

  if (orderIds.length === 0) return [];

  // ONE query instead of N queries
  const briefs = await CustomerBrief.find({
    orderId: { $in: orderIds },
    role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
    status: CustomerBriefStatus.Responded,
    viewed: false,
  })
    .populate("orderId", "orderNumber")
    .populate("productId", "name")
    .sort({ createdAt: -1 })
    .lean();

  // Format exactly like your original function with proper type casting
  const pendingResponses = briefs.map((brief: any) => {
    // Cast to any to access populated fields
    const order = brief.orderId as any;
    const product = brief.productId as any;

    return {
      briefId: brief._id,
      orderId: order?._id || brief.orderId,
      orderNumber: order?.orderNumber || "N/A",
      productName: product?.name || "Product",
      respondedAt: brief.createdAt,
      hasDesign: !!brief.designId,
      description: brief.description || "",
      viewed: brief.viewed || false,
      status: brief.status,
    };
  });

  return pendingResponses;
};

export const getAdminCustomerBriefs = async (
  adminId: string,
  filters: {
    status?: string;
    hasFiles?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<{
  briefs: any[];
  total: number;
  page: number;
  pages: number;
}> => {
  const {
    status,
    hasFiles,
    search,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const query: any = {};

  if (hasFiles) {
    query.$or = [
      { image: { $exists: true, $ne: null } },
      { voiceNote: { $exists: true, $ne: null } },
      { video: { $exists: true, $ne: null } },
      { logo: { $exists: true, $ne: null } },
    ];
  }

  if (status && status !== "all") {
    query.status = status;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search, "i");

    const matchingOrders = await Order.find({
      orderNumber: searchRegex,
    }).select("_id");

    const orderIds = matchingOrders.map((o) => o._id);

    const matchingProducts = await Product.find({
      name: searchRegex,
    }).select("_id");

    const productIds = matchingProducts.map((p) => p._id);

    query.$or = [
      { description: searchRegex },
      { orderId: { $in: orderIds } },
      { productId: { $in: productIds } },
    ];
  }

  const allBriefs = await CustomerBrief.find(query)
    .populate({
      path: "orderId",
      select: "orderNumber userId status",
      populate: { path: "userId", select: "email" },
    })
    .populate("productId", "name")
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .lean();

  const briefsList = [];

  for (const brief of allBriefs) {
    const hasFilesAttached = !!(
      brief.image ||
      brief.voiceNote ||
      brief.video ||
      brief.logo
    );

    // Safe access with type checking
    const order = brief.orderId as any;
    const product = brief.productId as any;
    const user = order?.userId as any;

    const orderNumber = order?.orderNumber || "N/A";
    const productName = product?.name || "Unknown Product";
    const customerEmail = user?.email || "customer@example.com";

    const briefStatus = brief.status || "pending";

    briefsList.push({
      _id: brief._id,
      description: brief.description,
      image: brief.image,
      voiceNote: brief.voiceNote,
      video: brief.video,
      logo: brief.logo,
      designId: brief.designId,
      createdAt: brief.createdAt,
      updatedAt: brief.updatedAt,
      viewed: brief.viewed || false,
      viewedAt: brief.viewedAt,
      adminViewed: brief.adminViewed || false,
      adminViewedAt: brief.adminViewedAt,
      orderId: brief.orderId,
      productId: brief.productId,
      role: brief.role,
      status: briefStatus,
      hasFiles: hasFilesAttached,
      orderNumber,
      productName,
      customerName: customerEmail.split("@")[0],
    });
  }

  const skip = (page - 1) * limit;
  const paginatedBriefs = briefsList.slice(skip, skip + limit);
  const total = briefsList.length;

  return {
    briefs: paginatedBriefs,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
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

  const product = await Product.findById(brief.productId);

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

  io.to("admin-room").emit("brief-deleted", {
    briefId: brief._id,
    orderId: brief.orderId,
    orderNumber: order.orderNumber,
    productId: brief.productId,
    productName: product?.name || "Unknown",
    role: brief.role,
    message: `Brief deleted`,
    timestamp: new Date(),
  });

  io.to(`user-${order.userId}`).emit("brief-deleted", {
    briefId: brief._id,
    orderId: brief.orderId,
    orderNumber: order.orderNumber,
    productId: brief.productId,
    productName: product?.name || "Unknown",
    role: brief.role,
    message: `A brief was deleted`,
    timestamp: new Date(),
  });

  await brief.deleteOne();

  await checkOrderReadyForInvoice(order._id.toString(), io);

  return { message: `${brief.role} brief deleted successfully` };
};

export const getCustomerBriefByOrderId = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<ICustomerBrief[]> => {
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

  return briefs;
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

export const getAllBriefsByOrderId = async (
  orderId: string,
  userId: string,
  userRole: string,
): Promise<ICustomerBrief[]> => {
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
    .sort({ createdAt: -1 })
    .exec();

  return briefs;
};

export const getOrderBriefStatus = async (orderId: string): Promise<any> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const productIds = order.items.map((item) => item.productId.toString());

  const productStatus = [];

  for (const productId of productIds) {
    const latestBrief = await CustomerBrief.findOne({
      orderId: orderId,
      productId: productId,
    }).sort({ createdAt: -1 });

    const product = order.items.find(
      (i) => i.productId.toString() === productId,
    );

    productStatus.push({
      productId,
      productName: product?.productName || "Unknown",
      status: latestBrief?.status || "no-brief",
      briefCount: latestBrief ? 1 : 0,
    });
  }

  const allProductsComplete = productStatus.every(
    (p) => p.status === "complete" || p.status === "no-brief",
  );

  return {
    orderId,
    orderNumber: order.orderNumber,
    currentStatus: order.status,
    allProductsComplete,
    productStatus,
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
    }).sort({ createdAt: -1 }),
    CustomerBrief.findOne({
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(productId),
      role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
    }).sort({ createdAt: -1 }),
  ]);

  return {
    hasAdminResponded: !!adminBrief,
    adminBrief,
    customerBrief,
  };
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
      role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
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

export const markBriefAsComplete = async (
  briefId: string,
  userId: string,
  userRole: string,
  io?: Server,
): Promise<ICustomerBrief> => {
  if (!Types.ObjectId.isValid(briefId)) {
    throw new Error("Invalid brief ID format");
  }

  const brief = await CustomerBrief.findById(briefId);

  if (!brief) {
    throw new Error("Brief not found");
  }

  const order = await Order.findById(brief.orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const isOrderOwner = order.userId.toString() === userId;
  const isAdmin =
    userRole === UserRole.Admin || userRole === UserRole.SuperAdmin;

  if (userRole === UserRole.Customer) {
    if (
      brief.role !== CustomerBriefRole.Admin &&
      brief.role !== CustomerBriefRole.SuperAdmin
    ) {
      throw new Error("Customers can only mark admin responses as complete");
    }
    if (!isOrderOwner) {
      throw new Error("You can only mark briefs from your own orders");
    }

    if (brief.status === CustomerBriefStatus.Complete) {
      return brief;
    }

    brief.viewed = true;
    brief.viewedAt = new Date();
    brief.status = CustomerBriefStatus.Complete;
    await brief.save();
  } else if (isAdmin) {
    if (brief.role !== CustomerBriefRole.Customer) {
      throw new Error("Admins can only mark customer briefs as complete");
    }

    if (brief.status === CustomerBriefStatus.Complete) {
      return brief;
    }

    brief.adminViewed = true;
    brief.adminViewedAt = new Date();
    brief.status = CustomerBriefStatus.Complete;
    await brief.save();
  } else {
    throw new Error("Unauthorized");
  }

  await checkAndUpdateOrderStatus(brief.orderId.toString(), io);
  return brief;
};

const checkAndUpdateOrderStatus = async (
  orderId: string,
  io?: Server,
): Promise<boolean> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  // Only proceed if order is in FilesUploaded status
  if (order.status !== OrderStatus.FilesUploaded) {
    console.log(
      `Order ${order.orderNumber} is not in FilesUploaded status (current: ${order.status})`,
    );
    return false;
  }

  if (order.invoiceId) {
    console.log(`Order ${order.orderNumber} already has an invoice`);
    return false;
  }

  // Get all unique product IDs in this order
  const productIds = order.items.map((item) => item.productId.toString());

  // Check if each product has at least one COMPLETE brief
  let allProductsHaveCompleteBrief = true;

  for (const productId of productIds) {
    // Find the latest brief for this product (or any brief with status Complete)
    const completeBrief = await CustomerBrief.findOne({
      orderId: orderId,
      productId: productId,
      status: CustomerBriefStatus.Complete,
    }).sort({ createdAt: -1 });

    if (!completeBrief) {
      console.log(`Product ${productId} has no complete brief`);
      allProductsHaveCompleteBrief = false;
      break;
    }
  }

  // If all products have at least one complete brief, move order to AwaitingInvoice
  if (allProductsHaveCompleteBrief) {
    console.log(
      `✅ All briefs for order ${order.orderNumber} are complete. Moving to AwaitingInvoice`,
    );

    order.status = OrderStatus.AwaitingInvoice;
    await order.save();

    if (io) {
      io.to("superadmin-room").emit("order-ready-for-invoice", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Order ready for invoice - all briefs completed",
      });
    }

    try {
      await notificationService.createForSuperAdmins({
        type: "order-ready-for-invoice",
        title: "Order Ready for Invoice",
        message: `Order #${order.orderNumber} is ready for invoice generation (all briefs completed)`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          itemCount: order.items.length,
          productIds: productIds,
        },
        link: `/dashboards/super-admin/invoices/ready?order=${order._id}`,
      });
    } catch (notifErr) {
      console.error("Failed to create order ready notification:", notifErr);
    }
  } else {
    console.log(
      `⏳ Order ${order.orderNumber} not ready - some briefs still pending`,
    );
  }

  return allProductsHaveCompleteBrief;
};
