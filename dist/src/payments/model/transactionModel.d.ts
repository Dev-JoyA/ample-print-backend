import { Document, Types } from "mongoose";
export declare enum TransactionStatus {
    Pending = "pending",
    Completed = "completed",
    Failed = "failed",
    Refunded = "refunded"
}
export declare enum TransactionType {
    Final = "final",
    Part = "part",
    Refund = "refund"
}
export declare enum PaymentMethod {
    Paystack = "paystack",
    BankTransfer = "bank_transfer"
}
export interface ITransaction extends Document {
    orderId: Types.ObjectId;
    orderNumber: string;
    invoiceId?: Types.ObjectId;
    transactionId: string;
    transactionAmount: number;
    transactionStatus: TransactionStatus;
    transactionType: TransactionType;
    paymentMethod: PaymentMethod;
    metadata: Record<string, any>;
    receiptUrl?: string;
    verifiedBy?: Types.ObjectId;
    verifiedAt?: Date;
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Transaction: import("mongoose").Model<ITransaction, {}, {}, {}, Document<unknown, {}, ITransaction, {}, {}> & ITransaction & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=transactionModel.d.ts.map