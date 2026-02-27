import { Document, Schema, Types, model } from "mongoose";
import { v4 as uuid } from "uuid";

export enum InvoiceStatus {
  Draft = "Draft",
  Sent = "Sent",
  PartiallyPaid = "PartiallyPaid",
  Paid = "Paid",
  Overdue = "Overdue",
  Cancelled = "Cancelled",
}

export enum InvoiceType {
  Main = "main",
  Shipping = "shipping",
  Deposit = "deposit",
}

export interface IInvoice extends Document {
  orderId: Types.ObjectId;
  orderNumber: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;

  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];

  subtotal: number;
  discount: number;
  totalAmount: number;

  depositAmount: number;
  partPaymentAmount: number;
  remainingAmount: number;
  amountPaid: number;

  status: InvoiceStatus;

  // Relationships
  transactions: Types.ObjectId[];
  shippingId?: Types.ObjectId;

  // Dates
  issueDate: Date;
  dueDate: Date;
  paidAt?: Date;

  // Metadata
  notes?: string;
  paymentInstructions?: string;

  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
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
    invoiceNumber: {
      type: String,
      required: true,
      default: () => uuid(), // ✅ UUID auto-generation
      unique: true,
      index: true,
    },
    invoiceType: {
      type: String,
      enum: Object.values(InvoiceType),
      default: InvoiceType.Main,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],

    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    depositAmount: { type: Number, default: 0, min: 0 },
    partPaymentAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.Draft,
      index: true,
    },

    transactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Transaction",
      },
    ],
    shippingId: {
      type: Schema.Types.ObjectId,
      ref: "Shipping",
    },

    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    paidAt: Date,

    notes: String,
    paymentInstructions: String,
  },
  { timestamps: true },
);

// Indexes
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ orderId: 1, invoiceType: 1 });

export const Invoice = model<IInvoice>("Invoice", InvoiceSchema);
