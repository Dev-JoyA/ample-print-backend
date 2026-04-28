import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { notificationController } from "../controller/notificationHistory.js";
const router = Router();
router.use(authMiddleware);
router.get("/history", notificationController.getNotificationHistory);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/:notificationId/read", notificationController.markAsRead);
router.post("/mark-all-read", notificationController.markAllAsRead);
router.delete("/:notificationId", notificationController.deleteNotification);
router.delete("/clear-all", notificationController.clearAllNotifications);
export default router;
//# sourceMappingURL=notificationRoutes.js.map