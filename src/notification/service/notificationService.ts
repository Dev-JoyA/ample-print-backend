import { Types } from "mongoose";
import { Notification, INotification } from "../models/notificationModel.js"

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

export const notificationService = {
  // Get user notifications with pagination
  getUserNotifications: async (
    userId: string | Types.ObjectId,
    filters: NotificationFilter = {}
  ): Promise<PaginatedNotifications> => {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    
    if (filters.read !== undefined) {
      query.read = filters.read;
    }
    
    if (filters.type) {
      query.type = filters.type;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query)
    ]);

    const formattedNotifications = notifications.map(n => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      timestamp: n.createdAt,
      read: n.read,
      link: n.link
    }));

    return {
      notifications: formattedNotifications,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  },

  // Create a new notification
  createNotification: async (
    userId: string | Types.ObjectId,
    data: {
      type: string;
      title: string;
      message: string;
      data?: any;
      link?: string;
    }
  ): Promise<any> => {
    const notification = await Notification.create({
      userId: new Types.ObjectId(userId.toString()),
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      link: data.link,
      read: false,
      createdAt: new Date()
    });

    return {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: notification.createdAt,
      read: notification.read,
      link: notification.link
    };
  },

  // Mark notification as read
  markAsRead: async (
    notificationId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<any | null> => {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId.toString()),
        userId: new Types.ObjectId(userId.toString())
      },
      {
        read: true,
        readAt: new Date()
      },
      { new: true }
    ).lean();

    if (!notification) return null;

    return {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: notification.createdAt,
      read: notification.read,
      link: notification.link
    };
  },

  // Mark all notifications as read for a user
  markAllAsRead: async (userId: string | Types.ObjectId): Promise<void> => {
    await Notification.updateMany(
      {
        userId: new Types.ObjectId(userId.toString()),
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );
  },

  // Delete a notification
  deleteNotification: async (
    notificationId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<boolean> => {
    const result = await Notification.deleteOne({
      _id: new Types.ObjectId(notificationId.toString()),
      userId: new Types.ObjectId(userId.toString())
    });

    return result.deletedCount > 0;
  },

  // Get unread count for a user
  getUnreadCount: async (userId: string | Types.ObjectId): Promise<number> => {
    return await Notification.countDocuments({
      userId: new Types.ObjectId(userId.toString()),
      read: false
    });
  },

  // Delete all notifications for a user (cleanup)
  deleteAllUserNotifications: async (userId: string | Types.ObjectId): Promise<void> => {
    await Notification.deleteMany({
      userId: new Types.ObjectId(userId.toString())
    });
  }
};