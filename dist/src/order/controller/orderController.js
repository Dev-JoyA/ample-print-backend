import * as orderService from "../service/orderService.js";
import { OrderStatus, } from "../model/orderModel.js";
const getIO = (req) => {
    return req.io || req.app.get("io");
};
export const createOrder = async (req, res) => {
    try {
        const io = getIO(req);
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const data = req.body;
        const order = await orderService.createOrder(user._id, data, io);
        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const updateOrder = async (req, res) => {
    try {
        const orderId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const data = req.body;
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        delete data._id;
        delete data.id;
        const order = await orderService.updateOrder(orderId, data, user._id, user.role);
        res.status(200).json({
            success: true,
            message: "Order updated successfully",
            order,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const deleteOrder = async (req, res) => {
    try {
        const orderId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const response = await orderService.deleteOrder(orderId, user._id, user.role);
        res.status(200).json({
            success: true,
            message: response,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const getOrderById = async (req, res) => {
    try {
        const orderId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const order = await orderService.getOrderById(orderId, user._id, user.role);
        res.status(200).json({
            success: true,
            order,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const getUserOrders = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const status = req.query.status;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await orderService.getUserOrders(user._id, page, limit, search, status);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const getAllOrders = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const paymentStatus = req.query.paymentStatus;
        const search = req.query.search;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await orderService.getAllOrders(user.role, page, limit, {
            status,
            paymentStatus,
            search,
        });
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const markOrderAsAwaitingInvoice = async (req, res) => {
    try {
        const user = req.user;
        const orderId = Array.isArray(req.params.orderId)
            ? req.params.orderId[0]
            : req.params.orderId;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const order = await orderService.markOrderAsAwaitingInvoice(orderId, user.role);
        res.status(200).json({
            success: true,
            message: "Order marked as awaiting invoice",
            order,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const searchByOrderNumber = async (req, res) => {
    try {
        const orderNumber = Array.isArray(req.params.orderNumber)
            ? req.params.orderNumber[0]
            : req.params.orderNumber;
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const order = await orderService.searchByOrderNumber(orderNumber, user._id, user.role);
        res.status(200).json({
            success: true,
            order,
        });
    }
    catch (err) {
        if (err.message === "Order not found") {
            return res.status(404).json({
                success: false,
                message: err.message,
            });
        }
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const updateOrderStatus = async (req, res) => {
    try {
        const io = getIO(req);
        const orderId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const { status } = req.body;
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }
        const order = await orderService.updateOrderStatus(orderId, status, user._id, user.role, io);
        res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            order,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const filterOrders = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const filters = {
            status: req.query.status,
            paymentStatus: req.query.paymentStatus,
            startDate: req.query.startDate
                ? new Date(req.query.startDate)
                : undefined,
            endDate: req.query.endDate
                ? new Date(req.query.endDate)
                : undefined,
            minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
            maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
            userId: req.query.userId,
            hasInvoice: req.query.hasInvoice === "true",
            hasShipping: req.query.hasShipping === "true",
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 10,
        };
        const result = await orderService.filterOrders(filters, user.role);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const getOrdersReadyForInvoice = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await orderService.getOrdersReadyForInvoice(user.role, page, limit);
        res.status(200).json({
            success: true,
            orders: result.orders,
            total: result.total,
            page: result.page,
            pages: result.pages,
        });
    }
    catch (error) {
        console.error("Error fetching orders ready for invoice:", error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getPaidOrders = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await orderService.getPaidOrders(user.role, page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const getPartiallyPaidOrders = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await orderService.getPartiallyPaidOrders(user.role, page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const getPendingPaymentOrders = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await orderService.getPendingPaymentOrders(user.role, page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const getOrdersReadyForShipping = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await orderService.getOrdersReadyForShipping(user.role, page, limit);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const superAdminCreateOrder = async (req, res) => {
    try {
        const io = getIO(req);
        const customerId = Array.isArray(req.params.customerId)
            ? req.params.customerId[0]
            : req.params.customerId;
        const data = req.body;
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (user.role !== "SuperAdmin") {
            return res.status(403).json({
                success: false,
                message: "Only super admin can create orders for customers",
            });
        }
        const order = await orderService.superAdminCreateOrder(customerId, data, user._id, io);
        res.status(201).json({
            success: true,
            message: "Order created for customer",
            order,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
export const addItemToOrder = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const orderId = Array.isArray(req.params.orderId)
            ? req.params.orderId[0]
            : req.params.orderId;
        const { productId, quantity } = req.body;
        const userId = user._id;
        const order = await orderService.addItemToOrderService(orderId, userId, productId, quantity);
        res.status(200).json({
            success: true,
            message: "Item added to order successfully",
            order,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getUserActiveOrders = async (req, res) => {
    try {
        const user = req.user;
        const { statuses } = req.query;
        let statusArray = [
            OrderStatus.OrderReceived,
            OrderStatus.Pending,
            OrderStatus.FilesUploaded,
            OrderStatus.AwaitingInvoice,
        ];
        if (statuses) {
            statusArray = statuses.split(",");
        }
        const orders = await orderService.getUserActiveOrders(user._id, statusArray);
        res.status(200).json({
            success: true,
            orders,
        });
    }
    catch (err) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
};
//# sourceMappingURL=orderController.js.map