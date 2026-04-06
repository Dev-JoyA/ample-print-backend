import { Request, Response } from "express";
/**
 * Initialize Paystack payment
 * POST /api/v1/payments/paystack/initialize
 */
export declare const initializePaystackPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Verify Paystack payment
 * GET /api/v1/payments/paystack/verify?reference=REFERENCE
 */
export declare const verifyPaystackPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Upload bank transfer receipt
 * POST /api/v1/payments/bank-transfer/upload-receipt
 */
export declare const uploadBankTransferReceipt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Verify bank transfer (Super Admin only)
 * POST /api/v1/payments/bank-transfer/verify/:transactionId
 */
export declare const verifyBankTransfer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get pending bank transfers (Super Admin only)
 * GET /api/v1/payments/bank-transfer/pending?page=1&limit=10
 */
export declare const getPendingBankTransfers: (req: Request, res: Response) => Promise<void>;
/**
 * Get transactions by order
 * GET /api/v1/payments/order/:orderId
 */
export declare const getTransactionsByOrder: (req: Request, res: Response) => Promise<void>;
/**
 * Get transactions by invoice
 * GET /api/v1/payments/invoice/:invoiceId
 */
export declare const getTransactionsByInvoice: (req: Request, res: Response) => Promise<void>;
/**
 * Get user's transactions
 * GET /api/v1/payments/my-transactions?page=1&limit=10
 */
export declare const getUserTransactions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=paymentController.d.ts.map