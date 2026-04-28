import { Router } from "express";
import multer from "multer";
import path from "path";
import * as paymentController from "../controller/paymentController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { checkAdmin, checkRole, checkSuperAdmin, } from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";
const router = Router();
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/receipts/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `receipt-${uniqueSuffix}${ext}`);
    },
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    }
    else {
        cb(new Error("Only image files and PDFs are allowed"), false);
    }
};
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
router.use(authMiddleware);
router.post("/paystack/initialize", checkRole([UserRole.Customer]), paymentController.initializePaystackPayment);
router.get("/paystack/verify", checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]), paymentController.verifyPaystackPayment);
router.post("/bank-transfer/upload-receipt", checkRole([UserRole.Customer]), upload.single("receipt"), paymentController.uploadBankTransferReceipt);
router.post("/bank-transfer/verify/:transactionId", checkSuperAdmin, paymentController.verifyBankTransfer);
router.get("/bank-transfer/pending", checkSuperAdmin, paymentController.getPendingBankTransfers);
router.get("/order/:orderId", checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]), paymentController.getTransactionsByOrder);
router.get("/invoice/:invoiceId", checkAdmin, paymentController.getTransactionsByInvoice);
router.get("/my-transactions", checkRole([UserRole.Customer]), paymentController.getUserTransactions);
export default router;
//# sourceMappingURL=paymentRoute.js.map