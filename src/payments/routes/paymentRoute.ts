import { Router } from "express";
import multer from "multer";
import path from "path";
import * as paymentController from "../controller/paymentController.js"; // ✅ Import controller, not service
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  checkAdmin,
  checkRole,
  checkSuperAdmin,
} from "../../middleware/authorization.js";
import { UserRole } from "../../users/model/userModel.js";

const router = Router();

// ==================== MULTER CONFIG FOR RECEIPT UPLOADS ====================
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

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files and PDFs are allowed") as any, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ==================== ALL ROUTES REQUIRE AUTHENTICATION ====================
router.use(authMiddleware);

// ==================== PAYSTACK ROUTES ====================
/**
 * @route POST /api/v1/payments/paystack/initialize
 * @desc Initialize Paystack payment
 * @access Customer
 */
router.post(
  "/paystack/initialize",
  checkRole([UserRole.Customer]),
  paymentController.initializePaystackPayment, // ✅ Use controller function
);

/**
 * @route GET /api/v1/payments/paystack/verify
 * @desc Verify Paystack payment
 * @access Customer, Admin, SuperAdmin
 */
router.get(
  "/paystack/verify",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  paymentController.verifyPaystackPayment, // ✅ Use controller function
);

// ==================== BANK TRANSFER ROUTES ====================

/**
 * @route POST /api/v1/payments/bank-transfer/upload-receipt
 * @desc Upload bank transfer receipt
 * @access Customer
 */
router.post(
  "/bank-transfer/upload-receipt",
  checkRole([UserRole.Customer]),
  upload.single("receipt"),
  paymentController.uploadBankTransferReceipt, // ✅ Use controller function
);

/**
 * @route POST /api/v1/payments/bank-transfer/verify/:transactionId
 * @desc Verify bank transfer (approve/reject)
 * @access SuperAdmin only
 */
router.post(
  "/bank-transfer/verify/:transactionId",
  checkSuperAdmin,
  paymentController.verifyBankTransfer, // ✅ Use controller function
);

/**
 * @route GET /api/v1/payments/bank-transfer/pending
 * @desc Get pending bank transfers
 * @access SuperAdmin only
 */
router.get(
  "/bank-transfer/pending",
  checkSuperAdmin,
  paymentController.getPendingBankTransfers, // ✅ Use controller function
);

// ==================== TRANSACTION QUERY ROUTES ====================

/**
 * @route GET /api/v1/payments/order/:orderId
 * @desc Get transactions by order ID
 * @access Order owner, Admin, SuperAdmin
 */
router.get(
  "/order/:orderId",
  checkRole([UserRole.Customer, UserRole.Admin, UserRole.SuperAdmin]),
  paymentController.getTransactionsByOrder, // ✅ Use controller function
);

/**
 * @route GET /api/v1/payments/invoice/:invoiceId
 * @desc Get transactions by invoice ID
 * @access Admin, SuperAdmin
 */
router.get(
  "/invoice/:invoiceId",
  checkAdmin,
  paymentController.getTransactionsByInvoice, // ✅ Use controller function
);

/**
 * @route GET /api/v1/payments/my-transactions
 * @desc Get logged-in customer's transactions
 * @access Customer only
 */
router.get(
  "/my-transactions",
  checkRole([UserRole.Customer]),
  paymentController.getUserTransactions, // ✅ Use controller function
);

export default router;
