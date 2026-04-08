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
  if (userRole === UserRole.Customer) {
    briefRole = CustomerBriefRole.Customer;

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
    briefRole = userRole === UserRole.Admin 
      ? CustomerBriefRole.Admin 
      : CustomerBriefRole.SuperAdmin;
  } else {
    throw new Error("Invalid user role");
  }

  const savedBrief = new CustomerBrief({
    ...brief,
    role: briefRole,
    viewed: false,
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
        type: 'new-customer-brief',
        title: 'New Customization Request',
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
            logo: !!brief.logo
          }
        },
        link: `/dashboards/admin/customer-briefs/${savedBrief._id}`
      });
    } catch (notifErr) {
      console.error('Failed to create new brief notification:', notifErr);
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
        type: 'admin-brief-response',
        title: 'Response to Your Customization Request',
        message: `Admin responded to your brief for ${product.name} (order #${order.orderNumber})`,
        data: {
          briefId: savedBrief._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: product._id,
          productName: product.name,
          hasDesign: !!savedBrief.designId,
          respondedBy: userId,
          responderRole: userRole
        },
        link: `/orders/${order._id}/products/${product._id}/briefs`
      });

      await notificationService.createForAdmins({
        type: 'admin-brief-responded',
        title: 'Admin Responded to Brief',
        message: `${userRole === UserRole.Admin ? 'Admin' : 'Super Admin'} responded to brief for ${product.name} (order #${order.orderNumber})`,
        data: {
          briefId: savedBrief._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: product._id,
          productName: product.name,
          respondedBy: userId,
          responderRole: userRole,
          hasDesign: !!savedBrief.designId
        },
        link: `/dashboards/admin/customer-briefs/${savedBrief._id}`
      });
      
    } catch (notifErr) {
      console.error('Failed to create admin response notification:', notifErr);
    }

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
    productName: product?.name || 'Unknown',
    role: brief.role,
    message: `Brief deleted`,
    timestamp: new Date(),
  });

  io.to(`user-${order.userId}`).emit("brief-deleted", {
    briefId: brief._id,
    orderId: brief.orderId,
    orderNumber: order.orderNumber,
    productId: brief.productId,
    productName: product?.name || 'Unknown',
    role: brief.role,
    message: `A brief was deleted`,
    timestamp: new Date(),
  });

  try {
    const notificationType = brief.role === CustomerBriefRole.Customer 
      ? 'customer-brief-deleted' 
      : 'admin-brief-deleted';
    
    const notificationTitle = brief.role === CustomerBriefRole.Customer
      ? 'Your Brief Was Deleted'
      : 'Admin Response Deleted';
    
    const notificationMessage = brief.role === CustomerBriefRole.Customer
      ? `Your brief for ${product?.name || 'product'} (order #${order.orderNumber}) was deleted`
      : `Admin response for ${product?.name || 'product'} (order #${order.orderNumber}) was deleted`;

    await notificationService.createForUser(order.userId, {
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      data: {
        briefId: brief._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        productId: brief.productId,
        productName: product?.name,
        role: brief.role,
        deletedBy: userId
      },
      link: `/orders/${order._id}`
    });

    if (userRole !== UserRole.Customer) {
      await notificationService.createForAdmins({
        type: 'admin-brief-deleted',
        title: brief.role === CustomerBriefRole.Customer 
          ? 'Customer Brief Deleted' 
          : 'Admin Response Deleted',
        message: `${brief.role === CustomerBriefRole.Customer ? 'Customer brief' : 'Admin response'} for order #${order.orderNumber} was deleted`,
        data: {
          briefId: brief._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          productId: brief.productId,
          productName: product?.name,
          role: brief.role,
          deletedBy: userId
        },
        link: `/dashboards/admin/orders/${order._id}`
      });
    }
    
  } catch (notifErr) {
    console.error('Failed to create brief deletion notification:', notifErr);
  }

  await brief.deleteOne();

  await checkOrderReadyForInvoice(order._id.toString(), io);

  return { message: `${brief.role} brief deleted successfully` };
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
  const isAdmin = userRole === UserRole.Admin || userRole === UserRole.SuperAdmin;

  if (userRole === UserRole.Customer) {
    if (brief.role !== CustomerBriefRole.Admin && brief.role !== CustomerBriefRole.SuperAdmin) {
      throw new Error("Customers can only mark admin responses as viewed");
    }
    if (!isOrderOwner) {
      throw new Error("You can only mark briefs from your own orders");
    }
  } else if (isAdmin) {
    if (brief.role !== CustomerBriefRole.Customer) {
      throw new Error("Admins can only mark customer briefs as viewed");
    }
  } else {
    throw new Error("Unauthorized");
  }

  brief.viewed = true;
  brief.viewedAt = new Date();
  await brief.save();

  if (io) {
    await checkOrderReadyForInvoice(brief.orderId.toString(), io);
  }

  return brief;
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

  const productIds = order.items.map(item => item.productId.toString());
  
  let allProductsReady = true;

  for (const productId of productIds) {
    const allBriefs = await CustomerBrief.find({ 
      orderId: orderId,
      productId: productId
    }).sort({ createdAt: 1 });

    if (allBriefs.length === 0) {
      continue;
    }

    const lastBrief = allBriefs[allBriefs.length - 1];
    
    let isProductReady = false;
    
    if (lastBrief.role === CustomerBriefRole.Admin || lastBrief.role === CustomerBriefRole.SuperAdmin) {
      isProductReady = lastBrief.viewed === true;
    } else if (lastBrief.role === CustomerBriefRole.Customer) {
      const hasAdminResponseAfter = await CustomerBrief.exists({
        orderId: orderId,
        productId: productId,
        role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
        createdAt: { $gt: lastBrief.createdAt }
      });
      
      if (lastBrief.viewed && !hasAdminResponseAfter) {
        isProductReady = true;
      }
    }

    if (!isProductReady) {
      allProductsReady = false;
    }
  }

  if (allProductsReady) {
    order.status = OrderStatus.AwaitingInvoice;
    await order.save();
    
    if (io) {
      io.to("superadmin-room").emit("order-ready-for-invoice", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Order ready for invoice"
      });
    }

    try {
      await notificationService.createForSuperAdmins({
        type: 'order-ready-for-invoice',
        title: 'Order Ready for Invoice',
        message: `Order #${order.orderNumber} is ready for invoice generation`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          itemCount: order.items.length,
          productIds: productIds
        },
        link: `/dashboards/super-admin/invoices/ready?order=${order._id}`
      });
    } catch (notifErr) {
      console.error('Failed to create order ready notification:', notifErr);
    }
  }

  return allProductsReady;
};

export const getOrderBriefStatus = async (orderId: string): Promise<any> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const productIds = order.items.map(item => item.productId.toString());
  
  const productStatus = [];

  for (const productId of productIds) {
    const allBriefs = await CustomerBrief.find({ 
      orderId: orderId,
      productId: productId
    }).sort({ createdAt: 1 });
    
    const product = order.items.find(i => i.productId.toString() === productId);
    
    let status = 'no-brief';
    let lastMessage = null;
    let lastRole = null;
    let isViewed = false;
    let briefCount = allBriefs.length;

    if (allBriefs.length > 0) {
      const lastBrief = allBriefs[allBriefs.length - 1];
      lastRole = lastBrief.role;
      isViewed = lastBrief.viewed;
      
      if (lastBrief.role === CustomerBriefRole.Admin || lastBrief.role === CustomerBriefRole.SuperAdmin) {
        if (lastBrief.viewed) {
          status = 'completed';
          lastMessage = 'customer-viewed';
        } else {
          status = 'pending-customer';
          lastMessage = 'admin-response';
        }
      } else if (lastBrief.role === CustomerBriefRole.Customer) {
        const hasAdminResponseAfter = await CustomerBrief.exists({
          orderId: orderId,
          productId: productId,
          role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
          createdAt: { $gt: lastBrief.createdAt }
        });
        
        if (hasAdminResponseAfter) {
          status = 'pending-customer';
          lastMessage = 'admin-response-waiting';
        } else if (lastBrief.viewed) {
          status = 'completed';
          lastMessage = 'admin-viewed';
        } else {
          status = 'pending-admin';
          lastMessage = 'customer-brief';
        }
      }
    }

    productStatus.push({
      productId,
      productName: product?.productName || 'Unknown',
      status,
      viewed: isViewed,
      briefCount,
      lastMessage: lastMessage,
      lastRole: lastRole
    });
  }

  const allProductsReady = productStatus.every(p => 
    p.status === 'completed' || p.status === 'no-brief'
  );

  return {
    orderId,
    orderNumber: order.orderNumber,
    currentStatus: order.status,
    allProductsReady,
    productStatus
  };
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
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    hasResponded?: boolean;
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
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    hasResponded 
  } = filters;

  const query: any = {
    role: CustomerBriefRole.Customer,
  };

  if (hasFiles) {
    query.$or = [
      { image: { $exists: true, $ne: null } },
      { voiceNote: { $exists: true, $ne: null } },
      { video: { $exists: true, $ne: null } },
      { logo: { $exists: true, $ne: null } }
    ];
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search, 'i');
    
    const matchingOrders = await Order.find({
      orderNumber: searchRegex
    }).select('_id');
    
    const orderIds = matchingOrders.map(o => o._id);

    const matchingProducts = await Product.find({
      name: searchRegex
    }).select('_id');
    
    const productIds = matchingProducts.map(p => p._id);

    query.$or = [
      { description: searchRegex },
      { orderId: { $in: orderIds } },
      { productId: { $in: productIds } }
    ];
  }

  const customerBriefs = await CustomerBrief.find(query)
    .populate({
      path: "orderId",
      select: "orderNumber userId status",
      populate: { path: "userId", select: "email" }
    })
    .populate("productId", "name")
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .lean();

  const validBriefs = customerBriefs.filter(brief => {
    if (!brief.orderId || !brief.productId) {
      console.log('Skipping brief with missing data:', { 
        briefId: brief._id, 
        hasOrderId: !!brief.orderId, 
        hasProductId: !!brief.productId 
      });
      return false;
    }
    return true;
  });

  const orderIds = validBriefs.map(brief => brief.orderId._id);
  
  const adminResponses = await CustomerBrief.find({
    orderId: { $in: orderIds },
    role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] }
  }).lean();

  const adminResponseMap = new Map<string, any>();
  for (const response of adminResponses) {
    const orderIdStr = response.orderId.toString();
    const existing = adminResponseMap.get(orderIdStr);
    if (!existing || new Date(response.createdAt) > new Date(existing.createdAt)) {
      adminResponseMap.set(orderIdStr, response);
    }
  }

  const briefsWithStatus = validBriefs.map((brief) => {
    const orderIdStr = brief.orderId._id.toString();
    const adminResponse = adminResponseMap.get(orderIdStr);
    
    const hasAdminResponse = !!adminResponse;
    const isAdminResponseNewer = hasAdminResponse && 
      new Date(adminResponse.createdAt) > new Date(brief.createdAt);
    
    let briefStatus = 'pending';
    if (brief.viewed) {
      briefStatus = 'viewed';
    } else if (isAdminResponseNewer) {
      briefStatus = 'responded';
    }
    
    const hasFilesAttached = !!(brief.image || brief.voiceNote || brief.video || brief.logo);
    
    const orderNumber = (brief.orderId as any)?.orderNumber || 'N/A';
    const productName = (brief.productId as any)?.name || 'Unknown Product';
    const customerEmail = (brief.orderId as any)?.userId?.email || 'customer@example.com';

    return {
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
      orderId: brief.orderId,
      productId: brief.productId,
      role: brief.role,
      hasAdminResponse,
      hasFiles: hasFilesAttached,
      status: briefStatus,
      orderNumber,
      productName,
      customerName: customerEmail.split('@')[0],
    };
  });

  let filteredBriefs = briefsWithStatus;
  if (status && status !== 'all') {
    filteredBriefs = briefsWithStatus.filter(b => b.status === status);
  }

  if (hasResponded !== undefined) {
    filteredBriefs = filteredBriefs.filter(b => b.hasAdminResponse === hasResponded);
  }

  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  filteredBriefs.sort((a, b) => {
    if (sortBy === 'createdAt') {
      return sortDirection === 1 
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  const skip = (page - 1) * limit;
  const paginatedBriefs = filteredBriefs.slice(skip, skip + limit);
  const total = filteredBriefs.length;

  return {
    briefs: paginatedBriefs,
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