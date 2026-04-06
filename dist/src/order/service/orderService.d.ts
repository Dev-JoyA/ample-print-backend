import mongoose, { Types } from "mongoose";
import { OrderData, OrderStatus, PaymentStatus, IOrderModel, PaginatedOrder } from "../model/orderModel.js";
import { Server } from "socket.io";
export declare const createOrder: (userId: string, data: OrderData, io: Server) => Promise<IOrderModel>;
export declare const superAdminCreateOrder: (customerId: string, data: OrderData, superAdminId: string, io: Server) => Promise<IOrderModel>;
export declare const updateOrder: (orderId: string, data: Partial<IOrderModel>, userId: string, userRole: string) => Promise<IOrderModel>;
export declare const deleteOrder: (orderId: string, userId: string, userRole: string) => Promise<string>;
export declare const getOrderById: (id: string, userId: string, userRole: string) => Promise<IOrderModel>;
export declare const getUserOrders: (userId: string, page?: number, limit?: number, search?: string, status?: OrderStatus) => Promise<PaginatedOrder>;
export declare const updateOrderStatus: (orderId: string, newStatus: OrderStatus, userId: string, userRole: string, io: Server) => Promise<IOrderModel>;
export declare const getAllOrders: (userRole: string, page?: number, limit?: number, filters?: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
}) => Promise<PaginatedOrder>;
export declare const getOrdersReadyForInvoice: (userRole: string) => Promise<IOrderModel[]>;
export declare const markOrderAsAwaitingInvoice: (orderId: string, userRole: string) => Promise<IOrderModel>;
export declare const searchByOrderNumber: (orderNumber: string, userId: string, userRole: string) => Promise<IOrderModel>;
export declare const filterOrders: (filters: {
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
}, userRole: string) => Promise<PaginatedOrder>;
export declare const getPaidOrders: (userRole: string, page?: number, limit?: number) => Promise<PaginatedOrder>;
export declare const getPartiallyPaidOrders: (userRole: string, page?: number, limit?: number) => Promise<PaginatedOrder>;
export declare const getPendingPaymentOrders: (userRole: string, page?: number, limit?: number) => Promise<PaginatedOrder>;
export declare const getOrdersReadyForShipping: (userRole: string, page?: number, limit?: number) => Promise<PaginatedOrder>;
export declare const updateOrderPayment: (orderId: string, paymentData: {
    amountPaid: number;
    paymentStatus: PaymentStatus;
    remainingBalance: number;
}) => Promise<IOrderModel>;
export declare const linkInvoiceToOrder: (orderId: string, invoiceId: Types.ObjectId, paymentType: "full" | "part", depositAmount?: number) => Promise<IOrderModel>;
export declare const addItemToOrderService: (orderId: string, userId: string, productId: string, quantity: number) => Promise<mongoose.Document<unknown, {}, IOrderModel, {}, {}> & IOrderModel & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const getUserActiveOrders: (userId: string, statuses?: OrderStatus[]) => Promise<IOrderModel[]>;
//# sourceMappingURL=orderService.d.ts.map