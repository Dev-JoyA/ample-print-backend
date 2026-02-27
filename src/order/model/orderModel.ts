import { Types, Document, model, Schema } from "mongoose";
import { v4 as uuid } from "uuid";

export enum PaymentStatus {
  Pending = "Pending",
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
  DesignUploaded = "DesignUploaded",
  UnderReview = "UnderReview",
  Approved = "Approved",
  AwaitingPartPayment = "AwaitingPartPayment",
  PartPaymentMade = "PartPaymentMade",
  InProduction = "InProduction",
  Completed = "Completed",
  AwaitingFinalPayment = "AwaitingFinalPayment",
  FinalPaid = "FinalPaid",
  ReadyForShipping = "ReadyForShipping",
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
    productSnapshot: any; // ✅ Keep this for price history
  }[];
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;

  // ✅ Add these to track invoice requirements
  requiredPaymentType?: "full" | "part"; // What super admin decided
  requiredDeposit?: number; // If part payment, how much deposit needed

  status: OrderStatus;
  paymentStatus: PaymentStatus;

  // ✅ Track which invoice applies to this order
  invoiceId?: Types.ObjectId;
  shippingId?: Types.ObjectId;

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
        productSnapshot: {
          type: Schema.Types.Mixed, // Store product details at time of order
        },
      },
    ],
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, required: true },

    // New fields
    requiredPaymentType: {
      type: String,
      enum: ["full", "part"],
    },
    requiredDeposit: {
      type: Number,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.Pending,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.Pending,
      index: true,
    },

    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },
    shippingId: {
      type: Schema.Types.ObjectId,
      ref: "Shipping",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, userId: 1 });
OrderSchema.index({ invoiceId: 1 });
OrderSchema.index({ shippingId: 1 });

export const Order = model<IOrderModel>("Order", OrderSchema);
