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
import { Profile } from "../../users/model/profileModel.js";
import { Server } from "socket.io";
import emailService from "../../utils/email.js";
import { notificationService } from "../../notification/service/notificationService.js";

const assertThreadOpen = async (
  orderId: Types.ObjectId,
  productId: Types.ObjectId,
): Promise<void> => {
  const latest = await CustomerBrief.findOne({ orderId, productId }).sort({
    createdAt: -1,
    _id: -1,
  });
  if (latest?.status === CustomerBriefStatus.Complete) {
    throw new Error(
      "This brief thread is complete. No further messages can be added.",
    );
  }
};

const getDisplayNames = async (
  userIds: Array<Types.ObjectId | string | undefined | null>,
): Promise<Map<string, string>> => {
  const ids = Array.from(
    new Set(userIds.filter(Boolean).map((id) => String(id))),
  );
  const names = new Map<string, string>();
  if (ids.length === 0) return names;

  const profiles = await Profile.find({ userId: { $in: ids } })
    .select("userId firstName lastName")
    .lean();

  for (const p of profiles as any[]) {
    const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
    if (name) names.set(String(p.userId), name);
  }
  return names;
};

const attachResponderNames = async (briefs: any[]): Promise<any[]> => {
  const names = await getDisplayNames(briefs.map((b) => b.respondedBy));
  return briefs.map((b) => {
    const plain = typeof b.toObject === "function" ? b.toObject() : b;
    return {
      ...plain,
      respondedByName: plain.respondedBy
        ? names.get(String(plain.respondedBy)) || null
        : null,
    };
  });
};


const getCustomerNames = async (
  userIds: Array<Types.ObjectId | string | undefined | null>,
): Promise<Map<string, { fullName: string; userName: string }>> => {
  const ids = Array.from(
    new Set(userIds.filter(Boolean).map((id) => String(id))),
  );
  const result = new Map<string, { fullName: string; userName: string }>();
  if (ids.length === 0) return result;
 
  const profiles = await Profile.find({ userId: { $in: ids } })
    .select("userId firstName lastName userName")
    .lean();
 
  for (const p of profiles as any[]) {
    result.set(String(p.userId), {
      fullName: [p.firstName, p.lastName].filter(Boolean).join(" ").trim(),
      userName: p.userName || "",
    });
  }
  return result;
};

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

  await assertThreadOpen(brief.orderId, brief.productId);

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
    }).sort({ createdAt: -1, _id: -1 });

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
    respondedBy:
      briefRole === CustomerBriefRole.Customer
        ? undefined
        : new Types.ObjectId(userId),
    hasOwnDesign: brief.hasOwnDesign || false,
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

    let responderName = userRole === UserRole.Admin ? "Admin" : "Super Admin";
    try {
      const names = await getDisplayNames([userId]);
      responderName = names.get(userId) || responderName;
    } catch (nameErr) {
      console.error("Failed to load responder name:", nameErr);
    }

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
        message: `${responderName} responded to brief for ${product.name} (order #${order.orderNumber})`,
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
    await brief.save();
  } else if (isAdmin) {
    if (brief.role !== CustomerBriefRole.Customer) {
      throw new Error("Admins can only mark customer briefs as viewed");
    }

    brief.adminViewed = true;
    brief.adminViewedAt = new Date();
    await brief.save();
  } else {
    throw new Error("Unauthorized");
  }

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

  if (order.userId.toString() !== userId) {
    throw new Error("Unauthorized to reply on this order");
  }

  await assertThreadOpen(brief.orderId, brief.productId);

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
    }).sort({ createdAt: -1, _id: -1 });

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

      io.to(`user-${order.userId}`).emit("briefs-confirmed", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        timestamp: new Date(),
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

    try {
      await notificationService.createForUser(order.userId, {
        type: "briefs-confirmed",
        title: "Customization Confirmed",
        message: `Your customization for order #${order.orderNumber} is confirmed. Your invoice will follow shortly.`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
        },
        link: `/orders/${order._id}`,
      });
    } catch (notifErr) {
      console.error("Failed to create briefs-confirmed notification:", notifErr);
    }

    try {
      const customer: any = await User.findById(order.userId).select("email");
      if (customer?.email) {
        const names = await getDisplayNames([order.userId]);
        const fullName = names.get(order.userId.toString());
        await emailService.sendBriefsConfirmed(
          customer.email,
          fullName ? fullName.split(" ")[0] : "there",
          order.orderNumber,
          order.items.map((item: any) => item.productName || "Your product"),
          `${process.env.FRONTEND_URL}/orders/${order._id}`,
        );
      }
    } catch (mailErr) {
      console.error("Failed to send briefs-confirmed email:", mailErr);
    }
  }

  return allProductsComplete;
};

export const getCustomerPendingBriefResponses = async (
  userId: string,
): Promise<any[]> => {
  const userOrders = await Order.find({ userId: new Types.ObjectId(userId) })
    .select("_id")
    .lean();

  const orderIds = userOrders.map((order) => order._id);
  if (orderIds.length === 0) return [];

  const briefs = await CustomerBrief.find({ orderId: { $in: orderIds } })
    .populate("orderId", "orderNumber")
    .populate("productId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const latestByThread = new Map<string, any>();
  for (const b of briefs as any[]) {
    const key = `${String(b.orderId?._id ?? b.orderId)}:${String(b.productId?._id ?? b.productId)}`;
    if (!latestByThread.has(key)) latestByThread.set(key, b);
  }

  return Array.from(latestByThread.values())
    .filter(
      (b) =>
        (b.role === CustomerBriefRole.Admin ||
          b.role === CustomerBriefRole.SuperAdmin) &&
        (b.status === CustomerBriefStatus.Responded ||
          b.status === CustomerBriefStatus.Complete),
    )
    .slice(0, 50)
    .map((b) => ({
      briefId: b._id,
      orderId: b.orderId?._id || b.orderId,
      orderNumber: b.orderId?.orderNumber || "N/A",
      productName: b.productId?.name || "Product",
      respondedAt: b.createdAt,
      hasDesign: !!b.designId,
      description: b.description || "",
      viewed: b.viewed || false,
      viewedAt: b.viewedAt || null,
      status: b.status,
    }));
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
 
  const conditions: any[] = [];
 
  if (hasFiles) {
    conditions.push({
      $or: [
        { image: { $exists: true, $ne: null } },
        { voiceNote: { $exists: true, $ne: null } },
        { video: { $exists: true, $ne: null } },
        { logo: { $exists: true, $ne: null } },
      ],
    });
  }
 
  if (search && search.trim()) {
    const searchRegex = new RegExp(
      search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
 
    const [matchingOrders, matchingProducts, matchingProfiles] =
      await Promise.all([
        Order.find({ orderNumber: searchRegex }).select("_id"),
        Product.find({ name: searchRegex }).select("_id"),
        Profile.find({
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { userName: searchRegex },
          ],
        }).select("userId"),
      ]);
 
    const customerOrders =
      matchingProfiles.length > 0
        ? await Order.find({
            userId: { $in: matchingProfiles.map((p) => p.userId) },
          }).select("_id")
        : [];
 
    conditions.push({
      $or: [
        { description: searchRegex },
        {
          orderId: {
            $in: [...matchingOrders, ...customerOrders].map((o) => o._id),
          },
        },
        { productId: { $in: matchingProducts.map((p) => p._id) } },
      ],
    });
  }
 
  const query: any = conditions.length > 0 ? { $and: conditions } : {};
 
  const allBriefs = await CustomerBrief.find(query)
    .populate("orderId", "orderNumber userId status")
    .populate("productId", "name")
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .lean();
 
  const latestByThread = new Map<string, any>();
  for (const b of allBriefs as any[]) {
    const key = `${String(b.orderId?._id ?? b.orderId)}:${String(b.productId?._id ?? b.productId)}`;
    const existing = latestByThread.get(key);
    if (!existing || new Date(b.createdAt) > new Date(existing.createdAt)) {
      latestByThread.set(key, b);
    }
  }
 
  const threadBriefs = Array.from(latestByThread.values()).filter(
    (b) => !status || status === "all" || b.status === status,
  );
 
  const responderNames = await getDisplayNames(
    threadBriefs.map((b: any) => b.respondedBy),
  );
 
  const customerInfo = await getCustomerNames(
    threadBriefs.map((b: any) => b.orderId?.userId),
  );
 
  const briefsList = [];
 
  for (const brief of threadBriefs) {
    const hasFilesAttached = !!(
      brief.image ||
      brief.voiceNote ||
      brief.video ||
      brief.logo
    );
 
    const order = brief.orderId as any;
    const product = brief.productId as any;
    const customer = customerInfo.get(String(order?.userId));
 
    const orderNumber = order?.orderNumber || "N/A";
    const productName = product?.name || "Unknown Product";
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
      respondedByName: brief.respondedBy
        ? responderNames.get(String(brief.respondedBy)) || null
        : null,
      status: briefStatus,
      hasFiles: hasFilesAttached,
      orderNumber,
      productName,
      customerName: customer?.fullName || customer?.userName || "Customer",
      customerUserName: customer?.userName || null,
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

  if (userRole === UserRole.Customer) {
    return briefs;
  }

  return (await attachResponderNames(briefs)) as unknown as ICustomerBrief[];
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
 
  if (userRole === UserRole.Customer) {
    return brief;
  }
 
  const customers = await getCustomerNames([order?.userId]);
  const customer = customers.get(String(order?.userId));
 
  return {
    ...brief.toObject(),
    customerName: customer?.fullName || customer?.userName || "Customer",
    customerUserName: customer?.userName || null,
  } as unknown as ICustomerBrief;
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
    }).sort({ createdAt: -1, _id: -1 });

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
    }).sort({ createdAt: -1, _id: -1 }),
    CustomerBrief.findOne({
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(productId),
      role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
    }).sort({ createdAt: -1, _id: -1 }),
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
        populate: { path: "userId", select: "email" },
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
): Promise<boolean> => checkOrderReadyForInvoice(orderId, io);

const getAutoCompleteHours = () =>
  Number(process.env.BRIEF_AUTO_COMPLETE_HOURS ?? 24);

export const autoCompleteSilentBriefs = async (
  io?: Server,
): Promise<number> => {
  const hours = getAutoCompleteHours();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const candidates = await CustomerBrief.find({
    role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
    status: CustomerBriefStatus.Responded,
    viewed: true,
    viewedAt: { $lte: cutoff },
  });

  let completed = 0;

  for (const brief of candidates) {
    try {
      const latest = await CustomerBrief.findOne({
        orderId: brief.orderId,
        productId: brief.productId,
      }).sort({ createdAt: -1, _id: -1 });

      if (!latest || latest._id.toString() !== brief._id.toString()) continue;

      const updated = await CustomerBrief.findOneAndUpdate(
        { _id: brief._id, status: CustomerBriefStatus.Responded },
        { $set: { status: CustomerBriefStatus.Complete } },
      );
      if (!updated) continue;

      completed++;

      const [order, product] = await Promise.all([
        Order.findById(brief.orderId),
        Product.findById(brief.productId),
      ]);
      if (!order) continue;

      const productName = product?.name || "your product";

      io?.to(`user-${order.userId}`).emit("brief-auto-confirmed", {
        briefId: brief._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        productName,
        timestamp: new Date(),
      });

      try {
        await notificationService.createForUser(order.userId, {
          type: "brief-auto-confirmed",
          title: "Customization Confirmed",
          message: `Your customization for ${productName} (order #${order.orderNumber}) was confirmed automatically after ${hours} hours without a reply.`,
          data: {
            briefId: brief._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            productId: brief.productId,
            productName,
          },
          link: `/briefs/${brief._id}`,
        });
      } catch (notifErr) {
        console.error("Failed to create auto-confirm notification:", notifErr);
      }

      await checkOrderReadyForInvoice(order._id.toString(), io);
    } catch (err) {
      console.error("Auto-complete failed for brief", brief._id, err);
    }
  }

  return completed;
};