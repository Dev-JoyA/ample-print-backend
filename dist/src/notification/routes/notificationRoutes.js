import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { notificationController } from "../controller/notificationHistory.js";
const router = Router();
// All notification routes require authentication
router.use(authMiddleware);
// Get notification history with pagination
router.get("/history", notificationController.getNotificationHistory);
// Get unread count
router.get("/unread-count", notificationController.getUnreadCount);
// Mark a specific notification as read
router.patch("/:notificationId/read", notificationController.markAsRead);
// Mark all notifications as read
router.post("/mark-all-read", notificationController.markAllAsRead);
// Delete a specific notification
router.delete("/:notificationId", notificationController.deleteNotification);
// Clear all notifications
router.delete("/clear-all", notificationController.clearAllNotifications);
export default router;
//# sourceMappingURL=notificationRoutes.js.map