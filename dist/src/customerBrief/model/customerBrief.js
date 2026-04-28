import { Schema, model } from "mongoose";
export var CustomerBriefRole;
(function (CustomerBriefRole) {
    CustomerBriefRole["Customer"] = "customer";
    CustomerBriefRole["Admin"] = "admin";
    CustomerBriefRole["SuperAdmin"] = "super-admin";
})(CustomerBriefRole || (CustomerBriefRole = {}));
export var CustomerBriefStatus;
(function (CustomerBriefStatus) {
    CustomerBriefStatus["Pending"] = "pending";
    CustomerBriefStatus["Responded"] = "responded";
    CustomerBriefStatus["Complete"] = "complete";
})(CustomerBriefStatus || (CustomerBriefStatus = {}));
const CustomerBriefSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        index: true,
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: Object.values(CustomerBriefRole),
        required: true,
        index: true,
    },
    description: {
        type: String,
    },
    designId: {
        type: Schema.Types.ObjectId,
        ref: "Design",
        required: false,
        index: true,
    },
    logo: String,
    image: String,
    voiceNote: String,
    video: String,
    viewed: {
        type: Boolean,
        default: false,
        index: true,
    },
    viewedAt: {
        type: Date,
    },
    adminViewed: {
        type: Boolean,
        default: false,
        index: true,
    },
    adminViewedAt: {
        type: Date,
    },
    status: {
        type: String,
        enum: Object.values(CustomerBriefStatus),
        default: CustomerBriefStatus.Pending,
        index: true,
    },
}, { timestamps: true });
CustomerBriefSchema.index({ orderId: 1, productId: 1, role: 1 });
CustomerBriefSchema.index({ orderId: 1 });
CustomerBriefSchema.index({ role: 1, createdAt: -1 });
CustomerBriefSchema.index({ status: 1 });
CustomerBriefSchema.index({
    role: 1,
    status: 1,
    viewed: 1,
    createdAt: -1,
});
export const CustomerBrief = model("CustomerBrief", CustomerBriefSchema);
//# sourceMappingURL=customerBrief.js.map