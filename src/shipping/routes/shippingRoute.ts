import { Router } from "express";
import * as shippingController from "../controller/shippingController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { checkAdmin, checkRole } from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";

const router = Router();

router.use(authMiddleware);

router.post("/order/:orderId", shippingController.createShipping);

router.put(
  "/:shippingId/tracking",
  checkAdmin,
  shippingController.updateShippingTracking,
);

router.patch(
  "/:shippingId/status",
  checkAdmin,
  shippingController.updateShippingStatus,
);

router.get("/all", checkAdmin, shippingController.getAllShipping);

router.get("/filter", checkAdmin, shippingController.filterShipping);

router.get(
  "/needing-invoice",
  checkAdmin,
  shippingController.getShippingNeedingInvoice,
);

router.get("/pending", checkAdmin, shippingController.getPendingShipping);

router.get(
  "/:shippingId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  shippingController.getShippingById,
);

router.get(
  "/order/:orderId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  shippingController.getShippingByOrderId,
);

export default router;
