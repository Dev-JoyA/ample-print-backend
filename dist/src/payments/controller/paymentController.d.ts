import { Request, Response } from "express";
export declare const initializePaystackPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const verifyPaystackPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const uploadBankTransferReceipt: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const verifyBankTransfer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPendingBankTransfers: (req: Request, res: Response) => Promise<void>;
export declare const getTransactionsByOrder: (req: Request, res: Response) => Promise<void>;
export declare const getTransactionsByInvoice: (req: Request, res: Response) => Promise<void>;
export declare const getUserTransactions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=paymentController.d.ts.map