import { Types } from "mongoose";
export interface NotificationFilter {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: string;
}
export interface PaginatedNotifications {
    notifications: any[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export type NotificationRecipient = string | Types.ObjectId | string[] | {
    userId: string | Types.ObjectId;
} | {
    customer?: string | Types.ObjectId;
    notifyAdmins?: boolean;
    notifySuperAdmins?: boolean;
    specificAdmins?: (string | Types.ObjectId)[];
    excludeUserId?: string | Types.ObjectId;
};
export declare const notificationService: {
    getUserNotifications: (userId: string | Types.ObjectId, filters?: NotificationFilter) => Promise<PaginatedNotifications>;
    resolveRecipients: (recipients: NotificationRecipient) => Promise<string[]>;
    createNotification: (recipients: NotificationRecipient, data: {
        type: string;
        title: string;
        message: string;
        data?: any;
        link?: string;
    }) => Promise<any[]>;
    createForUser: (userId: string | Types.ObjectId, data: {
        type: string;
        title: string;
        message: string;
        data?: any;
        link?: string;
    }) => Promise<any>;
    createForAdmins: (data: {
        type: string;
        title: string;
        message: string;
        data?: any;
        link?: string;
    }, excludeUserId?: string | Types.ObjectId) => Promise<any[]>;
    createForSuperAdmins: (data: {
        type: string;
        title: string;
        message: string;
        data?: any;
        link?: string;
    }, excludeUserId?: string | Types.ObjectId) => Promise<any[]>;
    createForCustomerAndAdmins: (customerId: string | Types.ObjectId, data: {
        type: string;
        title: string;
        message: string;
        data?: any;
        link?: string;
    }, notifyAdmins?: boolean) => Promise<any[]>;
    markAsRead: (notificationId: string | Types.ObjectId, userId: string | Types.ObjectId) => Promise<any | null>;
    markAllAsRead: (userId: string | Types.ObjectId) => Promise<void>;
    deleteNotification: (notificationId: string | Types.ObjectId, userId: string | Types.ObjectId) => Promise<boolean>;
    getUnreadCount: (userId: string | Types.ObjectId) => Promise<number>;
    deleteAllUserNotifications: (userId: string | Types.ObjectId) => Promise<void>;
};
//# sourceMappingURL=notificationService.d.ts.map