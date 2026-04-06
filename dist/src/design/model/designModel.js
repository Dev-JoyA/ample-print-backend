import { Schema, model } from "mongoose";
const DesignSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    version: {
        type: Number,
        default: 1,
    },
    isApproved: {
        type: Boolean,
        default: false,
    },
    approvedAt: Date,
    designUrl: String,
    filename: String,
    otherImage: [String],
    filenames: [String],
}, {
    timestamps: true,
});
DesignSchema.index({ orderId: 1, version: -1 }); // For getting latest version
DesignSchema.index({ productId: 1, createdAt: -1 }); // For product designs
DesignSchema.index({ isApproved: 1, orderId: 1 });
export const Design = model("Design", DesignSchema);
//# sourceMappingURL=designModel.js.map