import { Document, Types } from "mongoose";
export declare enum InvoiceStatus {
    Draft = "Draft",
    Sent = "Sent",
    PartiallyPaid = "PartiallyPaid",
    Paid = "Paid",
    Overdue = "Overdue",
    Cancelled = "Cancelled"
}
export declare enum InvoiceType {
    Main = "main",
    Shipping = "shipping",
    Deposit = "deposit"
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
    transactions: Types.ObjectId[];
    shippingId?: Types.ObjectId;
    issueDate: Date;
    dueDate: Date;
    paidAt?: Date;
    notes?: string;
    paymentInstructions?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Invoice: import("mongoose").Model<IInvoice, {}, {}, {}, Document<unknown, {}, IInvoice, {}, {}> & IInvoice & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=invoiceModel.d.ts.map