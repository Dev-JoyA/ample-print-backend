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
  markOrderAsAwaitingInvoice,
} from "../controller/orderController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  checkAdmin,
  checkRole,
  checkSuperAdmin,
} from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";

const router = Router();

router.use(authMiddleware);

router.post("/create", checkRole([UserRole.Customer]), createOrder);

router.post("/:orderId/items", checkRole([UserRole.Customer]), addItemToOrder);

router.get("/my-orders", authMiddleware, getUserOrders);

router.patch(
  "/:orderId/mark-awaiting-invoice",
  checkAdmin,
  markOrderAsAwaitingInvoice,
);

router.post(
  "/super-admin/create/:customerId",
  checkSuperAdmin,
  superAdminCreateOrder,
);

router.get("/ready-for-invoice", checkSuperAdmin, getOrdersReadyForInvoice);

router.delete("/:id", deleteOrder);

router.get("/", checkAdmin, getAllOrders);

router.patch("/:id/status", checkAdmin, updateOrderStatus);

router.get("/filter", checkAdmin, filterOrders);

router.get(
  "/my-active-orders",
  checkRole([UserRole.Customer]),
  getUserActiveOrders,
);

router.get("/search/:orderNumber", authMiddleware, searchByOrderNumber);

router.get("/payment/paid", checkAdmin, getPaidOrders);
router.get("/payment/part-paid", checkAdmin, getPartiallyPaidOrders);
router.get("/payment/pending", checkAdmin, getPendingPaymentOrders);

router.get("/ready-for-shipping", checkAdmin, getOrdersReadyForShipping);

router.put("/:id", updateOrder);

router.get("/:id", getOrderById);

export default router;
