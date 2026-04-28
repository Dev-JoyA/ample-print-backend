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
        unique: true,
        index: true,
    },
    orderNumber: {
        type: String,
        required: true,
        index: true,
    },
    shippingMethod: {
        type: String,
        enum: Object.values(ShippingMethod),
        required: true,
    },
    trackingNumber: {
        type: String,
        sparse: true,
    },
    carrier: {
        type: String,
    },
    driverName: {
        type: String,
    },
    driverPhone: {
        type: String,
    },
    recipientName: {
        type: String,
        required: function () {
            return this.shippingMethod === ShippingMethod.Delivery;
        },
    },
    recipientPhone: {
        type: String,
        required: function () {
            return this.shippingMethod === ShippingMethod.Delivery;
        },
    },
    address: {
        street: {
            type: String,
            required: function () {
                return this.shippingMethod === ShippingMethod.Delivery;
            },
        },
        city: {
            type: String,
            required: function () {
                return this.shippingMethod === ShippingMethod.Delivery;
            },
        },
        state: {
            type: String,
            required: function () {
                return this.shippingMethod === ShippingMethod.Delivery;
            },
        },
        country: {
            type: String,
            required: function () {
                return this.shippingMethod === ShippingMethod.Delivery;
            },
            default: "Nigeria",
        },
        postalCode: String,
    },
    shippingCost: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    shippingInvoiceId: {
        type: Schema.Types.ObjectId,
        ref: "Invoice",
    },
    isPaid: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: Object.values(ShippingStatus),
        default: ShippingStatus.Pending,
        required: true,
        index: true,
    },
    trackingHistory: [
        {
            status: {
                type: String,
                enum: Object.values(ShippingStatus),
                required: true,
            },
            location: String,
            description: String,
            timestamp: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    estimatedDelivery: Date,
    actualDelivery: Date,
    metadata: {
        type: Schema.Types.Mixed,
    },
}, { timestamps: true });
ShippingSchema.pre("validate", function (next) {
    if (this.shippingMethod === ShippingMethod.Delivery) {
        if (!this.recipientName) {
            next(new Error("Recipient name is required for delivery"));
        }
        if (!this.recipientPhone) {
            next(new Error("Recipient phone is required for delivery"));
        }
        if (!this.address?.street || !this.address?.city || !this.address?.state) {
            next(new Error("Complete address is required for delivery"));
        }
    }
    next();
});
ShippingSchema.index({ status: 1, createdAt: -1 });
ShippingSchema.index({ trackingNumber: 1 }, { sparse: true });
ShippingSchema.index({ shippingInvoiceId: 1 });
ShippingSchema.index({ orderNumber: 1 });
export const Shipping = model("Shipping", ShippingSchema);
//# sourceMappingURL=shippingModel.js.map