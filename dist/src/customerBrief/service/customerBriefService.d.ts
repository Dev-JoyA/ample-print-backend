import { ICustomerBrief, CreateCustomerBriefDTO, CustomerBriefRole } from "../model/customerBrief.js";
import { Server } from "socket.io";
export declare const createOrUpdateCustomerBrief: (brief: CreateCustomerBriefDTO, userId: string, userRole: string, io: Server) => Promise<ICustomerBrief>;
export declare const deleteCustomerBrief: (briefId: string, userId: string, userRole: string, io: Server) => Promise<{
    message: string;
}>;
export declare const markBriefAsViewed: (briefId: string, userId: string, userRole: string, io?: Server) => Promise<ICustomerBrief>;
export declare const checkOrderReadyForInvoice: (orderId: string, io?: Server) => Promise<boolean>;
export declare const getOrderBriefStatus: (orderId: string) => Promise<any>;
export declare const getAllBriefsByOrderId: (orderId: string, userId: string, userRole: string) => Promise<ICustomerBrief[]>;
export declare const getCustomerBriefById: (briefId: string, userId: string, userRole: string) => Promise<ICustomerBrief | null>;
export declare const getUserCustomerBriefs: (userId: string, page?: number, limit?: number) => Promise<{
    briefs: ICustomerBrief[];
    total: number;
    page: number;
    pages: number;
}>;
export declare const getCustomerBriefByOrderId: (orderId: string, userId: string, userRole: string) => Promise<{
    customer?: ICustomerBrief | null;
    admin?: ICustomerBrief | null;
    superAdmin?: ICustomerBrief | null;
}>;
export declare const getAdminCustomerBriefs: (adminId: string, filters?: {
    status?: "pending" | "responded" | "viewed" | "all";
    hasFiles?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}) => Promise<{
    briefs: any[];
    total: number;
    page: number;
    pages: number;
}>;
export declare const filterCustomerBriefs: (filters: {
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
}, userRole: string) => Promise<{
    briefs: ICustomerBrief[];
    total: number;
    page: number;
    pages: number;
}>;
export declare const checkAdminResponseStatus: (orderId: string, productId: string) => Promise<{
    hasAdminResponded: boolean;
    adminBrief?: ICustomerBrief | null;
    customerBrief?: ICustomerBrief | null;
}>;
export declare const getProductBriefAnalytics: (productId: string, startDate?: Date, endDate?: Date) => Promise<{
    totalBriefs: number;
    customerBriefs: number;
    adminResponses: number;
    completionRate: number;
}>;
//# sourceMappingURL=customerBriefService.d.ts.map