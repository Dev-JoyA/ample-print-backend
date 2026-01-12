import { Document, Types } from "mongoose";
export declare enum InvoiceStatus {
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
export declare const Invoice: import("mongoose").Model<IInvoice, {}, {}, {}, Document<unknown, {}, IInvoice, {}, {}> & IInvoice & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=invoiceModel.d.ts.map