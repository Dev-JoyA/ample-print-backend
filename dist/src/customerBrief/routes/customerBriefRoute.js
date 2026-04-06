import { Router } from "express";
import { uploadBriefFiles, submitCustomerBrief, adminRespondToBrief, getAllBriefsByOrderId, getBriefByOrderAndProduct, getCustomerBriefById, deleteCustomerBrief, getUserCustomerBriefs, getAdminCustomerBriefs, checkAdminResponseStatus, markBriefAsViewed, getOrderBriefStatus, } from "../controller/customerBriefController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { checkAdmin, checkRole, checkSuperAdmin, } from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";
const router = Router();
// ==================== ALL ROUTES REQUIRE AUTHENTICATION ====================
router.use(authMiddleware);
// ==================== CUSTOMER ROUTES ====================
// Submit or update a brief for an order/product
router.post("/customer/orders/:orderId/products/:productId/brief", checkRole([UserRole.Customer]), uploadBriefFiles, submitCustomerBrief);
router.put("/customer/orders/:orderId/products/:productId/brief", checkRole([UserRole.Customer]), uploadBriefFiles, submitCustomerBrief);
router.get("/briefs/order/:orderId/all", checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]), getAllBriefsByOrderId);
// Get all briefs submitted by the logged-in customer
router.get("/customer/briefs", checkRole([UserRole.Customer]), getUserCustomerBriefs);
// ==================== ADMIN ROUTES ====================
// Respond to a customer's brief
router.post("/admin/orders/:orderId/products/:productId/respond", checkAdmin, uploadBriefFiles, adminRespondToBrief);
router.put("/admin/orders/:orderId/products/:productId/respond", checkAdmin, uploadBriefFiles, adminRespondToBrief);
// Get all briefs that need admin attention
router.get("/admin/briefs", checkAdmin, getAdminCustomerBriefs);
// Mark brief as viewed (admin only)
router.patch("/briefs/:briefId/view", authMiddleware, markBriefAsViewed);
// ==================== SHARED ROUTES (MULTI-ROLE) ====================
// Get full conversation for an order/product (all roles)
router.get("/briefs/orders/:orderId/products/:productId", checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]), getBriefByOrderAndProduct);
// Get a specific brief by ID
router.get("/briefs/:briefId", checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]), getCustomerBriefById);
// Check admin response status for a brief
router.get("/briefs/status/:orderId/:productId", checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]), checkAdminResponseStatus);
// Get order brief status (check if all products are ready for invoice)
router.get("/briefs/order/:orderId/status", checkRole([UserRole.Admin, UserRole.SuperAdmin]), getOrderBriefStatus);
// ==================== SUPER ADMIN ONLY ROUTES ====================
// Delete any brief
router.delete("/briefs/:briefId", checkSuperAdmin, deleteCustomerBrief);
export default router;
//# sourceMappingURL=customerBriefRoute.js.map