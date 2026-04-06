import { ITransaction, TransactionType } from "../model/transactionModel.js";
import { Server } from "socket.io";
export declare const initializePaystackPayment: (orderId: string, invoiceId: string, amount: number, email: string, transactionType: TransactionType) => Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
}>;
export declare const verifyPaystackPayment: (reference: string, io: Server) => Promise<ITransaction>;
export declare const uploadBankTransferReceipt: (orderId: string, invoiceId: string, amount: number, userId: string, receiptUrl: string, transactionType: TransactionType, io: Server) => Promise<ITransaction>;
export declare const verifyBankTransfer: (transactionId: string, superAdminId: string, status: "approve" | "reject", notes?: string, io?: Server) => Promise<ITransaction>;
export declare const getPendingBankTransfers: (page?: number, limit?: number) => Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    pages: number;
}>;
export declare const getTransactionsByOrder: (orderId: string, userRole: string, userId: string) => Promise<ITransaction[]>;
export declare const getTransactionsByInvoice: (invoiceId: string) => Promise<ITransaction[]>;
export declare const getUserTransactions: (userId: string, page?: number, limit?: number) => Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    pages: number;
}>;
//# sourceMappingURL=paymentService.d.ts.map