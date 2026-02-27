import { Router } from "express";
import {
  createDesignController,
  updatedDesignController,
  deleteDesignController,
  approveDesignController,
  getDesignByIdController,
  getUserDesignsController, // ✅ Renamed
  getDesignByOrderIdController, // ✅ Fixed typo
  getDesignByProductIdController,
  getAllDesignsController,
  filterDesignController,
} from "../controller/designController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  checkSuperAdmin,
  checkAdmin,
  checkOwnership,
  checkRole, // ✅ Add if needed
} from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js"; // ✅ Add if using checkRole
import upload from "../../config/upload.js"; // ✅ Add multer upload

const router = Router();

// All routes require authentication by default
router.use(authMiddleware);

// ==================== UPLOAD DESIGN ====================
// POST /api/v1/design/orders/:orderId
// Body: { productId, description } + files
router.post(
  "/orders/:orderId", // ✅ Changed from :productId to :orderId
  checkAdmin,
  upload.array("images", 10), // ✅ Add multer for file uploads
  createDesignController,
);

// ==================== UPDATE DESIGN ====================
// PUT /api/v1/design/update/:designId
router.put(
  "/update/:designId",
  checkAdmin,
  upload.array("images", 10), // ✅ Add multer for optional file updates
  updatedDesignController,
);

// ==================== DELETE DESIGN ====================
// DELETE /api/v1/design/delete/:designId
router.delete("/delete/:designId", checkSuperAdmin, deleteDesignController);

// ==================== APPROVE DESIGN ====================
// PUT /api/v1/design/:designId/approve
router.put(
  "/:designId/approve",
  checkOwnership, // Customer who owns the order
  approveDesignController,
);

// ==================== GET DESIGN BY ID ====================
// GET /api/v1/design/:designId
router.get("/:designId", getDesignByIdController);

// ==================== GET USER DESIGNS ====================
// GET /api/v1/design/users/:userId
router.get(
  "/users/:userId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]), // Multiple roles
  getUserDesignsController, // ✅ Renamed
);

// ==================== GET DESIGNS BY ORDER ID ====================
// GET /api/v1/design/orders/:orderId
router.get(
  "/orders/:orderId",
  getDesignByOrderIdController, // ✅ Fixed typo
);

// ==================== GET DESIGNS BY PRODUCT ID ====================
// GET /api/v1/design/products/:productId
router.get("/products/:productId", getDesignByProductIdController);

// ==================== GET ALL DESIGNS (Admin) ====================
// GET /api/v1/design/all?page=1&limit=10
router.get("/all", checkAdmin, getAllDesignsController);

// ==================== FILTER DESIGNS (Admin) ====================
// GET /api/v1/design/filter?userId=&orderId=&isApproved=
router.get("/filter", checkAdmin, filterDesignController);

export default router;
