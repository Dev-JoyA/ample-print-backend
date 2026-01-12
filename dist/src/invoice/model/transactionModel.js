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
    TransactionType["Deposit"] = "deposit";
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
    },
    transactionId: {
        type: String,
        required: true,
        unique: true,
    },
    transactionAmount: {
        type: Number,
        required: true,
    },
    transactionStatus: {
        type: String,
        enum: Object.values(TransactionStatus),
        required: true,
    },
    transactionType: {
        type: String,
        enum: Object.values(TransactionType),
        required: true,
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
}, {
    timestamps: true,
});
export const Transaction = model("Transaction", TransactionSchema);
//# sourceMappingURL=transactionModel.js.map