import { Router } from "express";
import {
  createOrder,
  searchByOrderNumber,
  updateOrder,
  deleteOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  filterOrders,
  getOrdersReadyForInvoice,
  getPaidOrders,
  getPartiallyPaidOrders,
  getPendingPaymentOrders,
  getOrdersReadyForShipping,
  superAdminCreateOrder,
} from "../controller/orderController.js";
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

// ==================== CUSTOMER ROUTES ====================
// Create order (Customer only)
router.post("/create", checkRole([UserRole.Customer]), createOrder);

// Get logged-in user's orders
router.get("/my-orders", checkRole([UserRole.Customer]), getUserOrders);

// ==================== ORDER OWNER + ADMIN ROUTES ====================
// Get order by ID (owner or admin)
router.get("/:id", getOrderById);

// Update order (owner or admin - with restrictions)
router.put("/:id", updateOrder);

// ==================== SUPER ADMIN ONLY ROUTES ====================
// Delete order (owner or super admin - but we handle in service)
router.delete("/:id", deleteOrder);

// Super admin creates order for customer
router.post(
  "/super-admin/create/:customerId",
  checkSuperAdmin,
  superAdminCreateOrder,
);

// Get orders ready for invoice (super admin only)
router.get("/ready-for-invoice", checkSuperAdmin, getOrdersReadyForInvoice);

// ==================== ADMIN ONLY ROUTES ====================
// Get all orders (admin only)
router.get("/", checkAdmin, getAllOrders);

// Update order status (admin only)
router.patch("/:id/status", checkAdmin, updateOrderStatus);

// Filter orders (admin only)
router.get("/filter", checkAdmin, filterOrders);

// Search by order number (admin only)
router.get("/search/:orderNumber", checkAdmin, searchByOrderNumber);

// Payment status routes (admin only)
router.get("/payment/paid", checkAdmin, getPaidOrders);
router.get("/payment/part-paid", checkAdmin, getPartiallyPaidOrders);
router.get("/payment/pending", checkAdmin, getPendingPaymentOrders);

// Shipping ready routes (admin only)
router.get("/ready-for-shipping", checkAdmin, getOrdersReadyForShipping);

export default router;
