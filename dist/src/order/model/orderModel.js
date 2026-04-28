import { model, Schema } from "mongoose";
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Pending"] = "Pending";
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
    OrderStatus["AwaitingInvoice"] = "AwaitingInvoice";
    OrderStatus["InvoiceSent"] = "InvoiceSent";
    OrderStatus["DesignUploaded"] = "DesignUploaded";
    OrderStatus["UnderReview"] = "UnderReview";
    OrderStatus["Approved"] = "Approved";
    OrderStatus["AwaitingPartPayment"] = "AwaitingPartPayment";
    OrderStatus["PartPaymentMade"] = "PartPaymentMade";
    OrderStatus["InProduction"] = "InProduction";
    OrderStatus["Completed"] = "Completed";
    OrderStatus["AwaitingFinalPayment"] = "AwaitingFinalPayment";
    OrderStatus["FinalPaid"] = "FinalPaid";
    OrderStatus["ReadyForShipping"] = "ReadyForShipping";
    OrderStatus["Shipped"] = "Shipped";
    OrderStatus["Cancelled"] = "Cancelled";
    OrderStatus["Delivered"] = "Delivered";
})(OrderStatus || (OrderStatus = {}));
const OrderItemSchema = new Schema({
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
}, { _id: true });
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
}, {
    timestamps: true,
});
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, userId: 1 });
OrderSchema.index({ invoiceId: 1 });
OrderSchema.index({ shippingId: 1 });
export const Order = model("Order", OrderSchema);
//# sourceMappingURL=orderModel.js.map