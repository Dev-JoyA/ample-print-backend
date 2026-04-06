import { notificationService } from "../service/notificationService.js";
export const notificationController = {
    // GET /api/v1/notifications/history
    getNotificationHistory: async (req, res) => {
        try {
            const userId = req.user?._id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const read = req.query.read === 'true' ? true :
                req.query.read === 'false' ? false : undefined;
            const type = req.query.type;
            const result = await notificationService.getUserNotifications(userId, {
                page,
                limit,
                read,
                type
            });
            res.json({
                success: true,
                ...result
            });
        }
        catch (error) {
            console.error('Error fetching notification history:', error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch notifications"
            });
        }
    },
    // GET /api/v1/notifications/unread-count
    getUnreadCount: async (req, res) => {
        try {
            const userId = req.user?._id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }
            const count = await notificationService.getUnreadCount(userId);
            res.json({
                success: true,
                count
            });
        }
        catch (error) {
            console.error('Error fetching unread count:', error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch unread count"
            });
        }
    },
    // PATCH /api/v1/notifications/:notificationId/read
    markAsRead: async (req, res) => {
        try {
            const userId = req.user?._id;
            const { notificationId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }
            if (!notificationId) {
                res.status(400).json({
                    success: false,
                    message: "Notification ID is required"
                });
                return;
            }
            const notification = await notificationService.markAsRead(notificationId, userId);
            if (!notification) {
                res.status(404).json({
                    success: false,
                    message: "Notification not found"
                });
                return;
            }
            res.json({
                success: true,
                message: "Notification marked as read",
                data: notification
            });
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to mark notification as read"
            });
        }
    },
    // POST /api/v1/notifications/mark-all-read
    markAllAsRead: async (req, res) => {
        try {
            const userId = req.user?._id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }
            await notificationService.markAllAsRead(userId);
            res.json({
                success: true,
                message: "All notifications marked as read"
            });
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to mark all notifications as read"
            });
        }
    },
    // DELETE /api/v1/notifications/:notificationId
    deleteNotification: async (req, res) => {
        try {
            const userId = req.user?._id;
            const { notificationId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }
            if (!notificationId) {
                res.status(400).json({
                    success: false,
                    message: "Notification ID is required"
                });
                return;
            }
            const deleted = await notificationService.deleteNotification(notificationId, userId);
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    message: "Notification not found"
                });
                return;
            }
            res.json({
                success: true,
                message: "Notification deleted successfully"
            });
        }
        catch (error) {
            console.error('Error deleting notification:', error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to delete notification"
            });
        }
    },
    // DELETE /api/v1/notifications/clear-all
    clearAllNotifications: async (req, res) => {
        try {
            const userId = req.user?._id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }
            await notificationService.deleteAllUserNotifications(userId);
            res.json({
                success: true,
                message: "All notifications cleared"
            });
        }
        catch (error) {
            console.error('Error clearing notifications:', error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to clear notifications"
            });
        }
    }
};
//# sourceMappingURL=notificationHistory.js.map