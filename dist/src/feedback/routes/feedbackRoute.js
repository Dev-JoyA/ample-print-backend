import { Router } from "express";
import multer from "multer";
import path from "path";
import { createFeedback, respondToFeedback, updateStatus, deleteFeedback, getPendingFeedback, getFeedbackById, getFeedbackByOrderId, getUserFeedback, getAllFeedback, filterFeedback, } from "../controller/feedbackController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { checkAdmin, checkRole } from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";
const router = Router();
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    }
    else {
        cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed"), false);
    }
};
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
router.use(authMiddleware);
router.post("/", checkRole([UserRole.Customer]), upload.array("attachments", 5), createFeedback);
router.get("/user", checkRole([UserRole.Customer]), getUserFeedback);
router.get("/pending", checkAdmin, getPendingFeedback);
router.get("/all", checkAdmin, getAllFeedback);
router.get("/filter", checkAdmin, filterFeedback);
router.post("/:feedbackId/respond", checkAdmin, upload.array("attachments", 5), respondToFeedback);
router.patch("/:feedbackId/status", checkAdmin, updateStatus);
router.get("/:feedbackId", checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]), getFeedbackById);
router.get("/order/:orderId", checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]), getFeedbackByOrderId);
router.delete("/:feedbackId", checkRole([UserRole.SuperAdmin]), deleteFeedback);
export default router;
//# sourceMappingURL=feedbackRoute.js.map