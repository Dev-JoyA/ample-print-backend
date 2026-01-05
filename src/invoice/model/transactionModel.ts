import { Document, Types, model, Schema } from "mongoose";

export enum TransactionStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
  Refunded = "refunded",
}

export enum TransactionType {
  Deposit = "deposit",
  Final = "final",
  Part = "part",
  Refund = "refund",
}

export enum PaymentMethod {
  Paystack = "paystack",
  BankTransfer = "bank_transfer",
}

export interface ITransaction extends Document {
  orderId: Types.ObjectId;
  transactionId: string;
  transactionAmount: number;
  transactionStatus: TransactionStatus;
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  metadata: Record<string, any>; // Gateway response
  paidAt?: Date;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    transactionAmount: {
      type: Number,
      required: true,
    },
    transactionStatus: {
      type: String,
      enum: Object.values(TransactionStatus),
      required: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Transaction = model<ITransaction>(
  "Transaction",
  TransactionSchema,
);
