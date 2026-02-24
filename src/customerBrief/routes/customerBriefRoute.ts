import { Router } from "express";
import {
  uploadBriefFiles,
  submitCustomerBrief,
  adminRespondToBrief,
  getBriefByOrderAndProduct,
  getCustomerBriefById,
  deleteCustomerBrief,
  getUserCustomerBriefs,
  getAdminCustomerBriefs,
  checkAdminResponseStatus
} from "../controller/customerBriefController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { checkAdmin, checkRole, checkSuperAdmin } from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);


router.post(
  "/customer/orders/:orderId/products/:productId/brief",
  checkRole([UserRole.Customer]),
  uploadBriefFiles,
  submitCustomerBrief
);


router.put(
  "/customer/orders/:orderId/products/:productId/brief",
  checkRole([UserRole.Customer]),
  uploadBriefFiles,
  submitCustomerBrief
);


router.get(
  "/customer/briefs",
  checkRole([UserRole.Customer]),
  getUserCustomerBriefs
);

// ===== ADMIN ROUTES =====
// Admin responds to a customer brief
router.post(
  "/admin/orders/:orderId/products/:productId/respond",
  checkAdmin, 
  uploadBriefFiles,
  adminRespondToBrief
);

// Admin updates their response
router.put(
  "/admin/orders/:orderId/products/:productId/respond",
  checkAdmin, 
  uploadBriefFiles,
  adminRespondToBrief
);

// Get all briefs needing admin attention (dashboard)
router.get(
  "/admin/briefs",
  checkAdmin, 
  getAdminCustomerBriefs
);

// ===== SHARED ROUTES (accessible by multiple roles) =====
// Get full conversation for an order (all roles' briefs)
router.get(
  "/briefs/orders/:orderId/products/:productId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  getBriefByOrderAndProduct
);

// Get a specific brief by ID
router.get(
  "/briefs/:briefId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  getCustomerBriefById
);

// Check if admin has responded to a brief
router.get(
  "/briefs/status/:orderId/:productId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  checkAdminResponseStatus
);

// ===== SUPER ADMIN ONLY ROUTES =====
// Delete any brief (super admin only)
router.delete(
  "/briefs/:briefId",
  checkSuperAdmin, // SuperAdmin only
  deleteCustomerBrief
);

export default router;