import { IInvoice, InvoiceStatus, InvoiceType } from "../model/invoiceModel.js";
import { Server } from "socket.io";
export interface InvoiceFilter {
    status?: InvoiceStatus;
    invoiceType?: InvoiceType;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    userId?: string;
    orderId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
export interface PaginatedInvoices {
    invoices: IInvoice[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export declare const createInvoice: (orderId: string, data: {
    paymentType: "full" | "part";
    depositAmount?: number;
    discount?: number;
    dueDate: Date;
    notes?: string;
    paymentInstructions?: string;
    items?: Array<{
        productId: string;
        productName: string;
        quantity: number;
        totalPrice: number;
        originalTotal: number;
    }>;
}, superAdminId: string, io: Server) => Promise<IInvoice>;
export declare const createShippingInvoice: (orderId: string, shippingId: string, data: {
    shippingCost: number;
    dueDate: Date;
    notes?: string;
}, adminId: string, io: Server) => Promise<IInvoice>;
export declare const updateInvoice: (invoiceId: string, data: Partial<IInvoice> & {
    customItems?: Array<{
        productId: string;
        totalPrice: number;
        quantity: number;
        productName?: string;
    }>;
}, userId: string, userRole: string, io: Server) => Promise<IInvoice>;
export declare const deleteInvoice: (invoiceId: string, userRole: string, io: Server) => Promise<{
    message: string;
}>;
export declare const sendInvoiceToCustomer: (invoiceId: string, userId: string, userRole: string, io: Server) => Promise<IInvoice>;
export declare const updateInvoicePayment: (invoiceId: string, paymentAmount: number, transactionId: string, io: Server) => Promise<IInvoice>;
export declare const getAllInvoices: (page?: number, limit?: number) => Promise<PaginatedInvoices>;
export declare const getInvoiceById: (invoiceId: string, userId: string, userRole: string) => Promise<IInvoice | null>;
export declare const getInvoiceByNumber: (invoiceNumber: string, userId: string, userRole: string) => Promise<IInvoice | null>;
export declare const getInvoiceByOrderId: (orderId: string, userId: string, userRole: string) => Promise<IInvoice | null>;
export declare const getInvoiceByOrderNumber: (orderNumber: string, userId: string, userRole: string) => Promise<IInvoice | null>;
export declare const getUserInvoices: (userId: string, page?: number, limit?: number) => Promise<PaginatedInvoices>;
export declare const filterInvoices: (filters: InvoiceFilter) => Promise<PaginatedInvoices>;
//# sourceMappingURL=invoiceService.d.ts.map