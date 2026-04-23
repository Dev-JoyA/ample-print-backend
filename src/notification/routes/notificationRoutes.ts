import { Router, RequestHandler } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { notificationController } from "../controller/notificationHistory.js";
import { notificationService } from "../service/notificationService.js";

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Get notification history with pagination
router.get(
  "/history",
  notificationController.getNotificationHistory as RequestHandler,
);

// Get unread count
router.get(
  "/unread-count",
  notificationController.getUnreadCount as RequestHandler,
);

// Mark a specific notification as read
router.patch(
  "/:notificationId/read",
  notificationController.markAsRead as RequestHandler,
);

// Mark all notifications as read
router.post(
  "/mark-all-read",
  notificationController.markAllAsRead as RequestHandler,
);

// Delete a specific notification
router.delete(
  "/:notificationId",
  notificationController.deleteNotification as RequestHandler,
);

// Clear all notifications
router.delete(
  "/clear-all",
  notificationController.clearAllNotifications as RequestHandler,
);
export default router;
