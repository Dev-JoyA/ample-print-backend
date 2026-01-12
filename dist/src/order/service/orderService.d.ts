import { OrderData, IOrderModel, PaginatedOrder } from "../model/orderModel.js";
import { Server } from "socket.io";
export declare const createOrder: (id: string, data: OrderData, io: Server) => Promise<IOrderModel>;
export declare const updateOrder: (data: Partial<IOrderModel>) => Promise<IOrderModel>;
export declare const deleteOrder: (id: string) => Promise<string>;
export declare const getOrderById: (id: string) => Promise<IOrderModel>;
export declare const getUserOrder: (userId: string, page?: number, limit?: number) => Promise<PaginatedOrder>;
export declare const filterOrder: () => Promise<void>;
export declare const allOrders: () => Promise<IOrderModel[]>;
export declare const searchByOrderNumber: (orderNumber: string) => Promise<IOrderModel | null>;
//# sourceMappingURL=orderService.d.ts.map