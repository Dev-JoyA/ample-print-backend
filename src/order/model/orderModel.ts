import { Types, Document, model, Schema } from "mongoose";

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
  AwaitingInvoice = "AwaitingInvoice",
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

export interface IOrderItem {
  productId: Types.ObjectId;
  productName: string;
  quantity: number;
  price: number;
  productSnapshot?: {
    name?: string;
    description?: string;
    dimension?: { width: string; height: string };
    minOrder?: number;
    material?: string;
  };
}

const OrderItemSchema = new Schema(
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
      min: 1,
    },

    price: {
      type: Number,
      required: true,
    },

    productSnapshot: {
      name: String,
      description: String,
      dimension: {
        width: String,
        height: String,
      },
      minOrder: Number,
      material: String,
    },
  },
  { _id: true },
);

export interface IOrderModel extends Document {
  userId: Types.ObjectId;
  orderNumber: string;
  items: IOrderItem[];
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  requiredPaymentType?: "full" | "part";
  requiredDeposit?: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
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
      index: true,
      unique: true,
    },
    items: {
      type: [OrderItemSchema],
      default: [],
    },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, required: true },

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

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, userId: 1 });
OrderSchema.index({ invoiceId: 1 });
OrderSchema.index({ shippingId: 1 });

export const Order = model<IOrderModel>("Order", OrderSchema);
