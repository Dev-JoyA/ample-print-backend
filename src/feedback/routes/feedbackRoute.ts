import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  createFeedback,
  respondToFeedback,
  updateStatus,
  deleteFeedback,
  getPendingFeedback,
  getFeedbackById,
  getFeedbackByOrderId,
  getUserFeedback,
  getAllFeedback,
  filterFeedback,
} from "../controller/feedbackController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { checkAdmin, checkRole } from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";

const router = Router();

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files (jpeg, jpg, png, gif, webp) are allowed",
      ) as any,
      false,
    );
  }
};

// Multer config for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      cb(null, unique);
    },
  }),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// All routes require authentication
router.use(authMiddleware);

// ===== CUSTOMER ROUTES =====
router.post(
  "/",
  checkRole([UserRole.Customer]),
  upload.array("attachments", 5),
  createFeedback,
);

router.get("/user", checkRole([UserRole.Customer]), getUserFeedback);

// ===== ADMIN ROUTES =====
router.get("/pending", checkAdmin, getPendingFeedback);

// NEW: Get all feedback with pagination and filters
router.get("/all", checkAdmin, getAllFeedback);

// NEW: Advanced filtering
router.get("/filter", checkAdmin, filterFeedback);

router.post("/:feedbackId/respond", 
    checkAdmin, 
    upload.array("attachments", 5),
    respondToFeedback);

router.patch("/:feedbackId/status", checkAdmin, updateStatus);

// ===== SHARED ROUTES =====
router.get(
  "/:feedbackId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  getFeedbackById,
);

router.get(
  "/order/:orderId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  getFeedbackByOrderId,
);

// ===== SUPER ADMIN ONLY =====
router.delete(
  "/:feedbackId",
  checkRole([UserRole.SuperAdmin]),
  deleteFeedback,
);

export default router;