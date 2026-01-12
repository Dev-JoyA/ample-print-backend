import { model, Schema } from "mongoose";
import { v4 as uuid } from "uuid";
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Pending"] = "Pending";
    PaymentStatus["DepositPaid"] = "DepositPaid";
    PaymentStatus["PartPayment"] = "PartPayment";
    PaymentStatus["Completed"] = "Completed";
    PaymentStatus["Failed"] = "Failed";
    PaymentStatus["Refunded"] = "Refunded";
})(PaymentStatus || (PaymentStatus = {}));
export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Pending"] = "Pending";
    OrderStatus["OrderReceived"] = "OrderReceived";
    OrderStatus["FilesUploaded"] = "FilesUploaded";
    OrderStatus["InvoiceSent"] = "InvoiceSent";
    OrderStatus["AwaitingDeposit"] = "AwaitingDeposit";
    OrderStatus["DepositPaid"] = "DepositPaid";
    OrderStatus["DesignUploaded"] = "DesignUploaded";
    OrderStatus["UnderReview"] = "UnderReview";
    OrderStatus["Approved"] = "Approved";
    OrderStatus["AwaitingPartPayment"] = "AwaitingPartPayment";
    OrderStatus["PartPaymentMade"] = "PartPaymentMade";
    OrderStatus["InProduction"] = "InProduction";
    OrderStatus["Completed"] = "Completed";
    OrderStatus["AwaitingFinalPayment"] = "AwaitingFinalPayment";
    OrderStatus["FinalPaid"] = "FinalPaid";
    OrderStatus["Shipped"] = "Shipped";
    OrderStatus["Cancelled"] = "Cancelled";
    OrderStatus["Delivered"] = "Delivered";
})(OrderStatus || (OrderStatus = {}));
const OrderSchema = new Schema({
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
        },
    ],
    deposit: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    remainingBalance: { type: Number, required: true },
    isDepositPaid: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.Pending,
    },
    paymentStatus: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.Pending,
    },
}, {
    timestamps: true,
});
//filter by status:
export const Order = model("Order", OrderSchema);
//# sourceMappingURL=orderModel.js.map