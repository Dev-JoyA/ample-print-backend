import { IShipping, ShippingMethod, ShippingStatus } from "../model/shippingModel.js";
import { Server } from "socket.io";
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
export declare const createShipping: (orderId: string, data: CreateShippingData, adminId: string, io: Server) => Promise<IShipping>;
export declare const updateShippingTracking: (shippingId: string, data: {
    trackingNumber: string;
    carrier?: string;
    driverName?: string;
    driverPhone?: string;
    estimatedDelivery?: Date;
}, adminId: string, io: Server) => Promise<IShipping>;
export declare const updateShippingStatus: (shippingId: string, status: ShippingStatus, adminId: string, io: Server) => Promise<IShipping>;
export declare const markShippingAsPaid: (shippingId: string, invoiceId: string) => Promise<IShipping>;
export declare const getShippingById: (shippingId: string, userId: string, userRole: string) => Promise<IShipping | null>;
export declare const getShippingByOrderId: (orderId: string, userId: string, userRole: string) => Promise<IShipping | null>;
export declare const getAllShipping: (page?: number, limit?: number) => Promise<PaginatedShipping>;
export declare const filterShipping: (filters: IShippingFilter) => Promise<PaginatedShipping>;
export declare const getShippingNeedingInvoice: () => Promise<IShipping[]>;
export declare const getPendingShipping: () => Promise<IShipping[]>;
//# sourceMappingURL=shippingService.d.ts.map