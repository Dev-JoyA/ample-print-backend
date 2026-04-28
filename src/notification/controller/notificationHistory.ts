import { Request, Response } from "express";
import { Types } from "mongoose";
import { notificationService } from "../service/notificationService.js";

interface AuthRequest extends Request {
  user?: {
    _id: Types.ObjectId | string;
    role: string;
    email?: string;
  };
}

export const notificationController = {
  getNotificationHistory: async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const read =
        req.query.read === "true"
          ? true
          : req.query.read === "false"
            ? false
            : undefined;
      const type = req.query.type as string;

      const result = await notificationService.getUserNotifications(userId, {
        page,
        limit,
        read,
        type,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("Error fetching notification history:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch notifications",
      });
    }
  },

  getUnreadCount: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const count = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        count,
      });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch unread count",
      });
    }
  },

  markAsRead: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { notificationId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      if (!notificationId) {
        res.status(400).json({
          success: false,
          message: "Notification ID is required",
        });
        return;
      }

      const notification = await notificationService.markAsRead(
        notificationId as string,
        userId,
      );

      if (!notification) {
        res.status(404).json({
          success: false,
          message: "Notification not found",
        });
        return;
      }

      res.json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to mark notification as read",
      });
    }
  },

  markAllAsRead: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to mark all notifications as read",
      });
    }
  },

  deleteNotification: async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { notificationId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      if (!notificationId) {
        res.status(400).json({
          success: false,
          message: "Notification ID is required",
        });
        return;
      }

      const deleted = await notificationService.deleteNotification(
        notificationId as string,
        userId,
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Notification not found",
        });
        return;
      }

      res.json({
        success: true,
        message: "Notification deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete notification",
      });
    }
  },

  clearAllNotifications: async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      await notificationService.deleteAllUserNotifications(userId);

      res.json({
        success: true,
        message: "All notifications cleared",
      });
    } catch (error: any) {
      console.error("Error clearing notifications:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to clear notifications",
      });
    }
  },
};
