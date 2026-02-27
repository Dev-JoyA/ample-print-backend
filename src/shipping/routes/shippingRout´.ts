import { Router } from "express";
import * as shippingController from "../controller/shippingController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  checkAdmin,
  checkRole,
  checkSuperAdmin,
} from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";

const router = Router();

// ==================== ALL ROUTES REQUIRE AUTHENTICATION ====================
router.use(authMiddleware);

// ==================== ADMIN ROUTES ====================

/**
 * @route POST /api/v1/shipping/order/:orderId
 * @desc Create shipping record for an order
 * @access Admin, SuperAdmin
 */
router.post("/order/:orderId", checkAdmin, shippingController.createShipping);

/**
 * @route PUT /api/v1/shipping/:shippingId/tracking
 * @desc Update tracking information
 * @access Admin, SuperAdmin
 */
router.put(
  "/:shippingId/tracking",
  checkAdmin,
  shippingController.updateShippingTracking,
);

/**
 * @route PATCH /api/v1/shipping/:shippingId/status
 * @desc Update shipping status
 * @access Admin, SuperAdmin
 */
router.patch(
  "/:shippingId/status",
  checkAdmin,
  shippingController.updateShippingStatus,
);

/**
 * @route GET /api/v1/shipping/all
 * @desc Get all shipping records (paginated)
 * @access Admin, SuperAdmin
 */
router.get("/all", checkAdmin, shippingController.getAllShipping);

/**
 * @route GET /api/v1/shipping/filter
 * @desc Filter shipping records
 * @access Admin, SuperAdmin
 */
router.get("/filter", checkAdmin, shippingController.filterShipping);

/**
 * @route GET /api/v1/shipping/needing-invoice
 * @desc Get shipping records needing invoice
 * @access Admin, SuperAdmin
 */
router.get(
  "/needing-invoice",
  checkAdmin,
  shippingController.getShippingNeedingInvoice,
);

/**
 * @route GET /api/v1/shipping/pending
 * @desc Get pending shipping records
 * @access Admin, SuperAdmin
 */
router.get("/pending", checkAdmin, shippingController.getPendingShipping);

// ==================== SHARED ROUTES (Customer + Admin) ====================

/**
 * @route GET /api/v1/shipping/:shippingId
 * @desc Get shipping by ID
 * @access Owner, Admin, SuperAdmin
 */
router.get(
  "/:shippingId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  shippingController.getShippingById,
);

/**
 * @route GET /api/v1/shipping/order/:orderId
 * @desc Get shipping by order ID
 * @access Owner, Admin, SuperAdmin
 */
router.get(
  "/order/:orderId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  shippingController.getShippingByOrderId,
);

export default router;
