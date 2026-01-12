import { model, Schema } from "mongoose";
export var ShippingMethod;
(function (ShippingMethod) {
    ShippingMethod["Pickup"] = "pickup";
    ShippingMethod["Delivery"] = "delivery";
})(ShippingMethod || (ShippingMethod = {}));
export var ShippingStatus;
(function (ShippingStatus) {
    ShippingStatus["Pending"] = "pending";
    ShippingStatus["Shipped"] = "shipped";
    ShippingStatus["Delivered"] = "delivered";
})(ShippingStatus || (ShippingStatus = {}));
const ShippingSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    shippingMethod: {
        type: String,
        enum: Object.values(ShippingMethod),
        required: true,
    },
    trackingNumber: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(ShippingStatus),
        default: ShippingStatus.Pending,
        required: true,
    },
}, { timestamps: true });
export const Shipping = model("Shipping", ShippingSchema);
//# sourceMappingURL=shippingModel.js.map