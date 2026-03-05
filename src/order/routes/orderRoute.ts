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
  addItemToOrder,
  getUserActiveOrders,
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

router.post(
  "/:orderId/items",
  checkRole([UserRole.Customer]),
  addItemToOrder
);

// Get logged-in customer's orders
router.get("/my-orders", checkRole([UserRole.Customer]), getUserOrders);

// ==================== SUPER ADMIN ONLY ROUTES ====================
// Super admin creates order for a customer
router.post(
  "/super-admin/create/:customerId",
  checkSuperAdmin,
  superAdminCreateOrder
);

// Get orders ready for invoice
router.get("/ready-for-invoice", checkSuperAdmin, getOrdersReadyForInvoice);

// Delete order (owner or super admin handled in service)
router.delete("/:id", deleteOrder);

// ==================== ADMIN ONLY ROUTES ====================
// Get all orders
router.get("/", checkAdmin, getAllOrders);

// Update order status
router.patch("/:id/status", checkAdmin, updateOrderStatus);

// Filter orders
router.get("/filter", checkAdmin, filterOrders);

// Get user's active orders (orders that can still accept items)
router.get("/my-active-orders", checkRole([UserRole.Customer]), getUserActiveOrders);

// Search by order number
router.get("/search/:orderNumber", checkAdmin, searchByOrderNumber);

// Payment status routes
router.get("/payment/paid", checkAdmin, getPaidOrders);
router.get("/payment/part-paid", checkAdmin, getPartiallyPaidOrders);
router.get("/payment/pending", checkAdmin, getPendingPaymentOrders);

// Shipping ready routes
router.get("/ready-for-shipping", checkAdmin, getOrdersReadyForShipping);

// ==================== ORDER OWNER + ADMIN ROUTES ====================
// Update order (owner or admin)
router.put("/:id", updateOrder);

// Get order by ID (owner or admin)
router.get("/:id", getOrderById);

export default router;