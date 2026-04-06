import mongoose, { Types } from "mongoose";
import { CustomerBrief, CustomerBriefRole, } from "../model/customerBrief.js";
import { Order, OrderStatus } from "../../order/model/orderModel.js";
import { Product } from "../../product/model/productModel.js";
import { UserRole } from "../../users/model/userModel.js";
import { notificationService } from "../../notification/service/notificationService.js";
export const createOrUpdateCustomerBrief = async (brief, userId, userRole, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findById(brief.orderId).session(session).exec();
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Order not found for the provided orderId");
        }
        const product = await Product.findById(brief.productId).session(session).exec();
        if (!product) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Product not found for the provided productId");
        }
        const hasContent = brief.description ||
            brief.image ||
            brief.voiceNote ||
            brief.video ||
            brief.logo;
        if (!hasContent) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Customer brief must contain at least one customization detail");
        }
        let briefRole;
        let orderUpdated = false;
        if (userRole === UserRole.Customer) {
            briefRole = CustomerBriefRole.Customer;
            const allowedStatuses = [
                OrderStatus.Pending,
                OrderStatus.OrderReceived,
                OrderStatus.FilesUploaded,
            ];
            if (!allowedStatuses.includes(order.status)) {
                await session.abortTransaction();
                session.endSession();
                throw new Error(`Customer brief can only be created for orders that are Pending, Order Received, or Files Uploaded`);
            }
            if (order.status === OrderStatus.OrderReceived) {
                order.status = OrderStatus.FilesUploaded;
                await order.save({ session });
                orderUpdated = true;
            }
        }
        else if (userRole === UserRole.Admin || userRole === UserRole.SuperAdmin) {
            briefRole = userRole === UserRole.Admin
                ? CustomerBriefRole.Admin
                : CustomerBriefRole.SuperAdmin;
        }
        else {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Invalid user role");
        }
        const existingBrief = await CustomerBrief.findOne({
            orderId: brief.orderId,
            productId: brief.productId,
            role: briefRole,
        }).session(session);
        let savedBrief;
        if (existingBrief) {
            Object.assign(existingBrief, {
                description: brief.description,
                image: brief.image,
                voiceNote: brief.voiceNote,
                video: brief.video,
                logo: brief.logo,
                designId: brief.designId,
            });
            savedBrief = await existingBrief.save({ session });
        }
        else {
            const newBrief = new CustomerBrief({
                ...brief,
                role: briefRole,
                viewed: false,
            });
            savedBrief = await newBrief.save({ session });
        }
        await session.commitTransaction();
        session.endSession();
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
            }
            catch (error) {
                console.error('Failed to create new brief notification:', error.message);
            }
        }
        else if (userRole === UserRole.Admin || userRole === UserRole.SuperAdmin) {
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
            }
            catch (error) {
                console.error('Failed to create admin response notification:', error.message);
            }
            await checkOrderReadyForInvoice(order._id.toString(), io);
        }
        return savedBrief;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
export const deleteCustomerBrief = async (briefId, userId, userRole, io) => {
    if (!Types.ObjectId.isValid(briefId)) {
        throw new Error("Invalid brief ID format");
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const brief = await CustomerBrief.findById(briefId).session(session).exec();
        if (!brief) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Customer brief not found");
        }
        const order = await Order.findById(brief.orderId).session(session).exec();
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Associated order not found");
        }
        const product = await Product.findById(brief.productId).session(session).exec();
        if (userRole === UserRole.Customer) {
            if (brief.role !== CustomerBriefRole.Customer) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("Customers can only delete their own briefs");
            }
            if (order.userId.toString() !== userId) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("Unauthorized to delete this brief");
            }
            const allowedStatuses = [
                OrderStatus.Pending,
                OrderStatus.OrderReceived,
                OrderStatus.FilesUploaded,
            ];
            if (!allowedStatuses.includes(order.status)) {
                await session.abortTransaction();
                session.endSession();
                throw new Error(`Cannot delete brief when order is in ${order.status} status`);
            }
        }
        else if (userRole !== UserRole.SuperAdmin) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Unauthorized to delete this brief");
        }
        await brief.deleteOne({ session });
        await session.commitTransaction();
        session.endSession();
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
        }
        catch (error) {
            console.error('Failed to create brief deletion notification:', error.message);
        }
        await checkOrderReadyForInvoice(order._id.toString(), io);
        return { message: `${brief.role} brief deleted successfully` };
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
export const markBriefAsViewed = async (briefId, userId, userRole, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const brief = await CustomerBrief.findById(briefId).session(session).exec();
        if (!brief) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Brief not found");
        }
        if (brief.viewed) {
            await session.commitTransaction();
            session.endSession();
            return brief;
        }
        if (userRole === UserRole.Customer) {
            if (brief.role !== CustomerBriefRole.Admin && brief.role !== CustomerBriefRole.SuperAdmin) {
                await session.abortTransaction();
                session.endSession();
                throw new Error("Customers can only mark admin responses as viewed");
            }
        }
        else if (userRole !== UserRole.Admin && userRole !== UserRole.SuperAdmin) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Unauthorized");
        }
        brief.viewed = true;
        brief.viewedAt = new Date();
        await brief.save({ session });
        await session.commitTransaction();
        session.endSession();
        try {
            if (userRole === UserRole.Customer) {
                const order = await Order.findById(brief.orderId);
                await notificationService.createForAdmins({
                    type: 'brief-viewed',
                    title: 'Brief Viewed by Customer',
                    message: `Customer viewed the admin response for order #${order?.orderNumber}`,
                    data: {
                        briefId: brief._id,
                        orderId: brief.orderId,
                        productId: brief.productId,
                        viewedBy: userId
                    },
                    link: `/dashboards/admin/customer-briefs/${brief._id}`
                });
            }
        }
        catch (error) {
            console.error('Failed to create brief viewed notification:', error.message);
        }
        if (io) {
            await checkOrderReadyForInvoice(brief.orderId.toString(), io);
        }
        return brief;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
export const checkOrderReadyForInvoice = async (orderId, io) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findById(orderId).session(session).exec();
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("Order not found");
        }
        if (order.invoiceId || order.status !== OrderStatus.FilesUploaded) {
            await session.abortTransaction();
            session.endSession();
            return false;
        }
        const productIds = order.items.map(item => item.productId.toString());
        const briefs = await CustomerBrief.find({
            orderId: orderId,
            role: CustomerBriefRole.Customer
        }).session(session);
        if (briefs.length === 0) {
            order.status = OrderStatus.AwaitingInvoice;
            await order.save({ session });
            await session.commitTransaction();
            session.endSession();
            if (io) {
                io.to("superadmin-room").emit("order-ready-for-invoice", {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    message: "Order ready for invoice"
                });
            }
            return true;
        }
        let allProductsReady = true;
        for (const productId of productIds) {
            const productBriefs = briefs.filter(b => b.productId.toString() === productId);
            if (productBriefs.length === 0) {
                continue;
            }
            const latestBrief = productBriefs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            const adminResponse = await CustomerBrief.findOne({
                orderId: orderId,
                productId: productId,
                role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] },
                createdAt: { $gt: latestBrief.createdAt }
            }).session(session);
            const isReady = latestBrief.viewed || !!adminResponse;
            if (!isReady) {
                allProductsReady = false;
                break;
            }
        }
        if (allProductsReady) {
            order.status = OrderStatus.AwaitingInvoice;
            await order.save({ session });
        }
        await session.commitTransaction();
        session.endSession();
        if (allProductsReady && io) {
            io.to("superadmin-room").emit("order-ready-for-invoice", {
                orderId: order._id,
                orderNumber: order.orderNumber,
                message: "Order ready for invoice"
            });
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
            }
            catch (error) {
                console.error('Failed to create order ready notification:', error.message);
            }
        }
        return allProductsReady;
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
export const getOrderBriefStatus = async (orderId) => {
    const order = await Order.findById(orderId).exec();
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
                }
                else if (viewed) {
                    status = 'viewed';
                    lastMessage = 'customer';
                }
                else {
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
    const allProductsReady = productStatus.every(p => p.status === 'responded' || p.status === 'viewed' || p.status === 'no-brief');
    return {
        orderId,
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        allProductsReady,
        productStatus
    };
};
export const getAllBriefsByOrderId = async (orderId, userId, userRole) => {
    if (!Types.ObjectId.isValid(orderId)) {
        throw new Error("Invalid order ID format");
    }
    const order = await Order.findById(orderId).exec();
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
export const getCustomerBriefById = async (briefId, userId, userRole) => {
    if (!Types.ObjectId.isValid(briefId)) {
        throw new Error("Invalid brief ID format");
    }
    const brief = await CustomerBrief.findById(briefId)
        .populate("orderId", "orderNumber status userId totalAmount")
        .populate("productId", "name price dimensions mainImage")
        .populate("designId", "designUrl filename status")
        .exec();
    if (!brief)
        return null;
    const order = brief.orderId;
    if (userRole === UserRole.Customer && order.userId.toString() !== userId) {
        throw new Error("Unauthorized to view this brief");
    }
    return brief;
};
export const getUserCustomerBriefs = async (userId, page = 1, limit = 10) => {
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
export const getCustomerBriefByOrderId = async (orderId, userId, userRole) => {
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
export const getAdminCustomerBriefs = async (adminId, filters = {}) => {
    const { status, hasFiles, search, page = 1, limit = 10 } = filters;
    const query = {
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
        .sort({ createdAt: -1 })
        .lean();
    const briefsWithStatus = await Promise.all(customerBriefs.map(async (brief) => {
        const adminResponse = await CustomerBrief.findOne({
            orderId: brief.orderId._id,
            productId: brief.productId._id,
            role: { $in: [CustomerBriefRole.Admin, CustomerBriefRole.SuperAdmin] }
        }).sort({ createdAt: -1 });
        const hasFiles = !!(brief.image || brief.voiceNote || brief.video || brief.logo);
        let briefStatus = 'pending';
        if (brief.viewed) {
            briefStatus = 'viewed';
        }
        else if (adminResponse) {
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
    }));
    let filteredBriefs = briefsWithStatus;
    if (status && status !== 'all') {
        filteredBriefs = briefsWithStatus.filter(b => b.status === status);
    }
    const skip = (page - 1) * limit;
    const paginatedBriefs = filteredBriefs.slice(skip, skip + limit);
    return {
        briefs: paginatedBriefs,
        total: filteredBriefs.length,
        page,
        pages: Math.ceil(filteredBriefs.length / limit),
    };
};
export const filterCustomerBriefs = async (filters, userRole) => {
    if (userRole === UserRole.Customer) {
        throw new Error("Unauthorized to access this resource");
    }
    const { orderId, productId, role, hasDesign, startDate, endDate, searchTerm, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", } = filters;
    const query = {};
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
        }
        else {
            query.designId = null;
        }
    }
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate)
            query.createdAt.$gte = startDate;
        if (endDate)
            query.createdAt.$lte = endDate;
    }
    if (searchTerm) {
        query.$or = [{ description: { $regex: searchTerm, $options: "i" } }];
    }
    const skip = (page - 1) * limit;
    const sortOptions = {};
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
export const checkAdminResponseStatus = async (orderId, productId) => {
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
export const getProductBriefAnalytics = async (productId, startDate, endDate) => {
    const dateQuery = {};
    if (startDate || endDate) {
        dateQuery.createdAt = {};
        if (startDate)
            dateQuery.createdAt.$gte = startDate;
        if (endDate)
            dateQuery.createdAt.$lte = endDate;
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
        completionRate: customerBriefs > 0 ? (adminResponses / customerBriefs) * 100 : 0,
    };
};
//# sourceMappingURL=customerBriefService.js.map