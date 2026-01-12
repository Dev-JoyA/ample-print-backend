import { Document, Types } from "mongoose";
export declare enum TransactionStatus {
    Pending = "pending",
    Completed = "completed",
    Failed = "failed",
    Refunded = "refunded"
}
export declare enum TransactionType {
    Deposit = "deposit",
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
    transactionId: string;
    transactionAmount: number;
    transactionStatus: TransactionStatus;
    transactionType: TransactionType;
    paymentMethod: PaymentMethod;
    metadata: Record<string, any>;
    paidAt?: Date;
    createdAt: Date;
}
export declare const Transaction: import("mongoose").Model<ITransaction, {}, {}, {}, Document<unknown, {}, ITransaction, {}, {}> & ITransaction & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=transactionModel.d.ts.map