import { Types, Document, model, Schema } from "mongoose";
import { v4 as uuid } from "uuid";

export enum PaymentStatus {
  Pending = "Pending",
  DepositPaid = "DepositPaid",
  PartPayment = "PartPayment",
  Completed = "Completed",
  Failed = "Failed",
  Refunded = "Refunded",
}

export enum OrderStatus {
  Pending = "Pending",
  OrderReceived = "OrderReceived",
  FilesUploaded = "FilesUploaded",
  InvoiceSent = "InvoiceSent",
  AwaitingDeposit = "AwaitingDeposit",
  DepositPaid = "DepositPaid",
  DesignUploaded = "DesignUploaded",
  UnderReview = "UnderReview",
  Approved = "Approved",
  AwaitingPartPayment = "AwaitingPartPayment",
  PartPaymentMade = "PartPaymentMade",
  InProduction = "InProduction",
  Completed = "Completed",
  AwaitingFinalPayment = "AwaitingFinalPayment",
  FinalPaid = "FinalPaid",
  Shipped = "Shipped",
  Cancelled = "Cancelled",
  Delivered = "Delivered",
}

export interface IOrderModel extends Document {
  userId: Types.ObjectId;
  orderNumber: string;
  items: {
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    price: number;
  }[];
  deposit: number;
  totalAmount: number;
  filename: string;
  amountPaid: number;
  remainingBalance: number;
  isDepositPaid: boolean;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderData {
  items: {
    productId: Types.ObjectId;
    quantity: number;
  }[];
}

export interface PaginatedOrder {
  order: IOrderModel[];
  total: number;
  page: number;
  limit: number;
}

const OrderSchema = new Schema<IOrderModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuid(),
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],

    deposit: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    remainingBalance: { type: Number, required: true },
    isDepositPaid: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.Pending,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.Pending,
    },
  },
  {
    timestamps: true,
  },
);

OrderSchema.index({ status: 1, createdAt: -1 }); // For dashboard queries
OrderSchema.index({ paymentStatus: 1, userId: 1 }); // For user payment queries
//filter by status:

export const Order = model<IOrderModel>("Order", OrderSchema);
