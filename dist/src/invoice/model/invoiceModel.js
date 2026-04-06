import { Schema, model } from "mongoose";
export var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["Draft"] = "Draft";
    InvoiceStatus["Sent"] = "Sent";
    InvoiceStatus["PartiallyPaid"] = "PartiallyPaid";
    InvoiceStatus["Paid"] = "Paid";
    InvoiceStatus["Overdue"] = "Overdue";
    InvoiceStatus["Cancelled"] = "Cancelled";
})(InvoiceStatus || (InvoiceStatus = {}));
export var InvoiceType;
(function (InvoiceType) {
    InvoiceType["Main"] = "main";
    InvoiceType["Shipping"] = "shipping";
    InvoiceType["Deposit"] = "deposit";
})(InvoiceType || (InvoiceType = {}));
const InvoiceSchema = new Schema({
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
}, { timestamps: true });
// Indexes
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ orderId: 1, invoiceType: 1 });
export const Invoice = model("Invoice", InvoiceSchema);
//# sourceMappingURL=invoiceModel.js.map