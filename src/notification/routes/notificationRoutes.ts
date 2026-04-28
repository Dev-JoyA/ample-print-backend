import { Router, RequestHandler } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { notificationController } from "../controller/notificationHistory.js";

const router = Router();

router.use(authMiddleware);

router.get(
  "/history",
  notificationController.getNotificationHistory as RequestHandler,
);

router.get(
  "/unread-count",
  notificationController.getUnreadCount as RequestHandler,
);

router.patch(
  "/:notificationId/read",
  notificationController.markAsRead as RequestHandler,
);

router.post(
  "/mark-all-read",
  notificationController.markAllAsRead as RequestHandler,
);

router.delete(
  "/:notificationId",
  notificationController.deleteNotification as RequestHandler,
);

router.delete(
  "/clear-all",
  notificationController.clearAllNotifications as RequestHandler,
);
export default router;
