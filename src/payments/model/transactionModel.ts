import { Document, Types, model, Schema } from "mongoose";

export enum TransactionStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
  Refunded = "refunded",
}

export enum TransactionType {
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
  orderNumber: string;
  invoiceId?: Types.ObjectId;
  transactionId: string; // Gateway reference
  transactionAmount: number;
  transactionStatus: TransactionStatus;
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  metadata: Record<string, any>; // Gateway response

  // For bank transfers
  receiptUrl?: string;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;

  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    transactionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionStatus: {
      type: String,
      enum: Object.values(TransactionStatus),
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
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
    // For bank transfers
    receiptUrl: String,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,
    paidAt: Date,
  },
  {
    timestamps: true,
  },
);

// Indexes
TransactionSchema.index({ orderId: 1, createdAt: -1 });
TransactionSchema.index({ transactionStatus: 1, createdAt: -1 });
TransactionSchema.index({ transactionType: 1, transactionStatus: 1 });

export const Transaction = model<ITransaction>(
  "Transaction",
  TransactionSchema,
);
