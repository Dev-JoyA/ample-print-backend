import { model, Schema } from "mongoose";
export var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Pending"] = "pending";
    TransactionStatus["Completed"] = "completed";
    TransactionStatus["Failed"] = "failed";
    TransactionStatus["Refunded"] = "refunded";
})(TransactionStatus || (TransactionStatus = {}));
export var TransactionType;
(function (TransactionType) {
    TransactionType["Final"] = "final";
    TransactionType["Part"] = "part";
    TransactionType["Refund"] = "refund";
})(TransactionType || (TransactionType = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["Paystack"] = "paystack";
    PaymentMethod["BankTransfer"] = "bank_transfer";
})(PaymentMethod || (PaymentMethod = {}));
const TransactionSchema = new Schema({
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
    receiptUrl: String,
    verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    verifiedAt: Date,
    paidAt: Date,
}, {
    timestamps: true,
});
TransactionSchema.index({ orderId: 1, createdAt: -1 });
TransactionSchema.index({ transactionStatus: 1, createdAt: -1 });
TransactionSchema.index({ transactionType: 1, transactionStatus: 1 });
export const Transaction = model("Transaction", TransactionSchema);
//# sourceMappingURL=transactionModel.js.map