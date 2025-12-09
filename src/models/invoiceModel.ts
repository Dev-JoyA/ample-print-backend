import { Document, Schema, Types, model } from "mongoose";
import { v4 as uuid } from 'uuid';

export enum InvoiceStatus {
    Draft = "Draft",
    Sent = "Sent",
    Paid = "Paid",
    Overdue = "Overdue"
}

export interface IInvoice extends Document {
    orderId: Types.ObjectId;
    invoiceNumber: string;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    totalAmount: number;
    depositAmount?: number; 
    partPaymentAmount?: number;
    remainingAmount: number;
    dueDate: Date;
    status: InvoiceStatus;
    createdAt: Date;
    updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true
        },
        invoiceNumber: {
            type: String,
            required: true,
            default: () => uuid(),
            unique: true
        },
        items: [{
            description: { type: String, required: true },
            quantity: { type: Number, required: true, default: 1 },
            unitPrice: { type: Number, required: true },
            total: { type: Number, required: true }
        }],
        totalAmount: { type: Number, required: true },
        depositAmount: { type: Number, required: true },
        partPaymentAmount: { type: Number },
        remainingAmount: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        status: {
            type: String,
            enum: Object.values(InvoiceStatus),
            default: InvoiceStatus.Draft
        }
    },
    { timestamps: true }
);

export const Invoice = model<IInvoice>("Invoice", InvoiceSchema);