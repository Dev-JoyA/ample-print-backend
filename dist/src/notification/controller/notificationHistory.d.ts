import { Request, Response } from "express";
import { Types } from "mongoose";
interface AuthRequest extends Request {
    user?: {
        _id: Types.ObjectId | string;
        role: string;
        email?: string;
    };
}
export declare const notificationController: {
    getNotificationHistory: (req: AuthRequest, res: Response) => Promise<void>;
    getUnreadCount: (req: AuthRequest, res: Response) => Promise<void>;
    markAsRead: (req: AuthRequest, res: Response) => Promise<void>;
    markAllAsRead: (req: AuthRequest, res: Response) => Promise<void>;
    deleteNotification: (req: AuthRequest, res: Response) => Promise<void>;
    clearAllNotifications: (req: AuthRequest, res: Response) => Promise<void>;
};
export {};
//# sourceMappingURL=notificationHistory.d.ts.map