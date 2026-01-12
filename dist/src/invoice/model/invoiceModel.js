import { Schema, model } from "mongoose";
import { v4 as uuid } from "uuid";
export var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["Draft"] = "Draft";
    InvoiceStatus["Sent"] = "Sent";
    InvoiceStatus["Paid"] = "Paid";
    InvoiceStatus["Overdue"] = "Overdue";
})(InvoiceStatus || (InvoiceStatus = {}));
const InvoiceSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        index: true,
    },
    invoiceNumber: {
        type: String,
        required: true,
        default: () => uuid(),
        unique: true,
    },
    items: [
        {
            description: { type: String, required: true },
            quantity: { type: Number, required: true, default: 1 },
            unitPrice: { type: Number, required: true },
            total: { type: Number, required: true },
        },
    ],
    totalAmount: { type: Number, required: true },
    depositAmount: { type: Number, required: true },
    partPaymentAmount: { type: Number },
    remainingAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: Object.values(InvoiceStatus),
        default: InvoiceStatus.Draft,
    },
}, { timestamps: true });
export const Invoice = model("Invoice", InvoiceSchema);
//# sourceMappingURL=invoiceModel.js.map