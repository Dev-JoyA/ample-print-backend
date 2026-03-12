import { Types } from "mongoose";
import { Notification, INotification } from "../models/notificationModel.js";
import { User, UserRole } from "../../users/model/userModel.js";

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

// Define recipient types
export type NotificationRecipient = 
  | string // Single user ID
  | Types.ObjectId // Single user ID as ObjectId
  | string[] // Array of user IDs
  | { userId: string | Types.ObjectId } // Single user with options
  | { 
      customer?: string | Types.ObjectId; // Customer user ID
      notifyAdmins?: boolean; // Whether to notify all admins
      notifySuperAdmins?: boolean; // Whether to notify all super admins
      specificAdmins?: (string | Types.ObjectId)[]; // Specific admin IDs
      excludeUserId?: string | Types.ObjectId; // User to exclude (for self-actions)
    };

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

  // Enhanced create notification that can handle multiple recipients
  createNotification: async (
    recipients: NotificationRecipient,
    data: {
      type: string;
      title: string;
      message: string;
      data?: any;
      link?: string;
    }
  ): Promise<any[]> => {
    try {
      // Resolve recipient user IDs
      const userIds = await notificationService.resolveRecipients(recipients);
      
      if (userIds.length === 0) {
        console.log('No recipients found for notification');
        return [];
      }

      // Create notifications for all recipients
      const notifications = await Promise.all(
        userIds.map(userId => 
          Notification.create({
            userId: new Types.ObjectId(userId.toString()),
            type: data.type,
            title: data.title,
            message: data.message,
            data: data.data || {},
            link: data.link,
            read: false,
            createdAt: new Date()
          })
        )
      );

      return notifications.map(n => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        timestamp: n.createdAt,
        read: n.read,
        link: n.link
      }));
    } catch (error) {
      console.error('Error creating notifications:', error);
      throw error;
    }
  },

  // Helper function to resolve recipients into array of user IDs
  resolveRecipients: async (recipients: NotificationRecipient): Promise<string[]> => {
    let userIds: string[] = [];

    // Case 1: Direct string ID
    if (typeof recipients === 'string') {
      userIds = [recipients];
    }
    
    // Case 2: ObjectId
    else if (recipients instanceof Types.ObjectId) {
      userIds = [recipients.toString()];
    }
    
    // Case 3: Array of IDs
    else if (Array.isArray(recipients)) {
      userIds = recipients.map(id => id.toString());
    }
    
    // Case 4: Object with userId
    else if ('userId' in recipients) {
      userIds = [recipients.userId.toString()];
    }
    
    // Case 5: Complex object with roles
    else if ('customer' in recipients || 'notifyAdmins' in recipients || 'notifySuperAdmins' in recipients) {
      const { customer, notifyAdmins, notifySuperAdmins, specificAdmins, excludeUserId } = recipients;
      
      // Add customer if specified
      if (customer) {
        userIds.push(customer.toString());
      }
      
      // Add specific admins if provided
      if (specificAdmins && specificAdmins.length > 0) {
        userIds.push(...specificAdmins.map(id => id.toString()));
      }
      
      // Add all admins if requested
      if (notifyAdmins) {
        const admins = await User.find({
          role: UserRole.Admin,
          isActive: true
        }).select('_id').lean();
        userIds.push(...admins.map(a => a._id.toString()));
      }
      
      // Add all super admins if requested
      if (notifySuperAdmins) {
        const superAdmins = await User.find({
          role: UserRole.SuperAdmin,
          isActive: true
        }).select('_id').lean();
        userIds.push(...superAdmins.map(sa => sa._id.toString()));
      }
      
      // Remove excluded user if specified
      if (excludeUserId) {
        userIds = userIds.filter(id => id !== excludeUserId.toString());
      }
    }

    // Remove duplicates and return
    return [...new Set(userIds)];
  },

  // Create notification for a single user (backward compatibility)
  createForUser: async (
    userId: string | Types.ObjectId,
    data: {
      type: string;
      title: string;
      message: string;
      data?: any;
      link?: string;
    }
  ): Promise<any> => {
    const notifications = await notificationService.createNotification(userId, data);
    return notifications[0] || null;
  },

  // Create notification for all admins and super admins
  createForAdmins: async (
    data: {
      type: string;
      title: string;
      message: string;
      data?: any;
      link?: string;
    },
    excludeUserId?: string | Types.ObjectId
  ): Promise<any[]> => {
    return await notificationService.createNotification(
      { notifyAdmins: true, notifySuperAdmins: true, excludeUserId },
      data
    );
  },

  // Create notification for super admins only
  createForSuperAdmins: async (
    data: {
      type: string;
      title: string;
      message: string;
      data?: any;
      link?: string;
    },
    excludeUserId?: string | Types.ObjectId
  ): Promise<any[]> => {
    return await notificationService.createNotification(
      { notifySuperAdmins: true, excludeUserId },
      data
    );
  },

  // Create notification for customer and optionally admins
  createForCustomerAndAdmins: async (
    customerId: string | Types.ObjectId,
    data: {
      type: string;
      title: string;
      message: string;
      data?: any;
      link?: string;
    },
    notifyAdmins: boolean = true
  ): Promise<any[]> => {
    return await notificationService.createNotification(
      { customer: customerId, notifyAdmins, notifySuperAdmins: notifyAdmins },
      data
    );
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