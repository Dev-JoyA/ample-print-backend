import { Router } from "express";
import * as invoiceController from "../controller/invoiceController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  checkAdmin,
  checkSuperAdmin,
  checkRole,
} from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";

const router = Router();

// ==================== ALL ROUTES REQUIRE AUTHENTICATION ====================
router.use(authMiddleware);

// ==================== SUPER ADMIN ONLY ROUTES ====================

/**
 * @route POST /api/v1/invoices/order/:orderId
 * @desc Create main invoice for order (Super Admin only)
 * @access SuperAdmin
 */
router.post(
  "/order/:orderId",
  checkSuperAdmin,
  invoiceController.createInvoice,
);

// ==================== ADMIN ROUTES ====================

/**
 * @route POST /api/v1/invoices/shipping/order/:orderId/shipping/:shippingId
 * @desc Create shipping invoice (Admin only)
 * @access Admin, SuperAdmin
 */
router.post(
  "/shipping/order/:orderId/shipping/:shippingId",
  checkAdmin,
  invoiceController.createShippingInvoice,
);

/**
 * @route PUT /api/v1/invoices/:invoiceId
 * @desc Update invoice (draft only)
 * @access Admin, SuperAdmin
 */
router.put("/:invoiceId", checkAdmin, invoiceController.updateInvoice);

/**
 * @route POST /api/v1/invoices/:invoiceId/send
 * @desc Send invoice to customer
 * @access Admin, SuperAdmin
 */
router.post(
  "/:invoiceId/send",
  checkAdmin,
  invoiceController.sendInvoiceToCustomer,
);

/**
 * @route GET /api/v1/invoices/all
 * @desc Get all invoices (paginated)
 * @access Admin, SuperAdmin
 */
router.get("/all", checkAdmin, invoiceController.getAllInvoices);

/**
 * @route GET /api/v1/invoices/filter
 * @desc Filter invoices with criteria
 * @access Admin, SuperAdmin
 */
router.get("/filter", checkAdmin, invoiceController.filterInvoices);

// ==================== SHARED ROUTES (Customer + Admin + SuperAdmin) ====================

/**
 * @route GET /api/v1/invoices/id/:invoiceId
 * @desc Get invoice by ID
 * @access Owner, Admin, SuperAdmin
 */
router.get(
  "/id/:invoiceId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  invoiceController.getInvoiceById,
);

/**
 * @route GET /api/v1/invoices/number/:invoiceNumber
 * @desc Get invoice by invoice number
 * @access Owner, Admin, SuperAdmin
 */
router.get(
  "/number/:invoiceNumber",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  invoiceController.getInvoiceByNumber,
);

/**
 * @route GET /api/v1/invoices/order-id/:orderId
 * @desc Get invoice by order ID
 * @access Owner, Admin, SuperAdmin
 */
router.get(
  "/order-id/:orderId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  invoiceController.getInvoiceByOrderId,
);

/**
 * @route GET /api/v1/invoices/order-number/:orderNumber
 * @desc Get invoice by order number
 * @access Owner, Admin, SuperAdmin
 */
router.get(
  "/order-number/:orderNumber",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  invoiceController.getInvoiceByOrderNumber,
);

// ==================== CUSTOMER ONLY ROUTES ====================

/**
 * @route GET /api/v1/invoices/my-invoices
 * @desc Get logged-in customer's invoices
 * @access Customer only
 */
router.get(
  "/my-invoices",
  checkRole([UserRole.Customer]),
  invoiceController.getUserInvoices,
);

// ==================== SUPER ADMIN ONLY DELETE ====================

/**
 * @route DELETE /api/v1/invoices/:invoiceId
 * @desc Delete invoice (draft only)
 * @access SuperAdmin only
 */
router.delete("/:invoiceId", checkSuperAdmin, invoiceController.deleteInvoice);

export default router;
