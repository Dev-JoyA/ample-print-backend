import { IFeedback, FeedBackStatus } from "../model/feedback.js";
import { Server } from "socket.io";
interface FeedbackFilterOptions {
    page?: number;
    limit?: number;
    status?: FeedBackStatus;
    orderId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
}
export declare const createCustomerFeedback: (data: {
    orderId: string;
    designId?: string;
    message: string;
    attachments?: string[];
}, userId: string, io: Server) => Promise<IFeedback>;
export declare const adminRespondToFeedback: (feedbackId: string, response: string, attachments: string[], adminId: string, io: Server) => Promise<IFeedback>;
export declare const updateFeedbackStatus: (feedbackId: string, status: FeedBackStatus, userId: string, userRole: string, io: Server) => Promise<IFeedback>;
export declare const getAllFeedback: (options: FeedbackFilterOptions) => Promise<{
    feedback: IFeedback[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}>;
export declare const filterFeedback: (filters: FeedbackFilterOptions) => Promise<{
    feedback: IFeedback[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}>;
export declare const getPendingFeedback: (page?: number, limit?: number) => Promise<{
    feedback: IFeedback[];
    total: number;
    page: number;
    pages: number;
}>;
export declare const getFeedbackById: (feedbackId: string, userId: string, userRole: string) => Promise<IFeedback | null>;
export declare const getFeedbackByOrderId: (orderId: string, userId: string, userRole: string) => Promise<IFeedback[]>;
export declare const getUserFeedback: (userId: string, page?: number, limit?: number, status?: FeedBackStatus) => Promise<{
    feedback: IFeedback[];
    total: number;
    page: number;
    pages: number;
}>;
export declare const deleteFeedback: (feedbackId: string, userId: string, userRole: string, io: Server) => Promise<{
    message: string;
}>;
export {};
//# sourceMappingURL=feedbackService.d.ts.map