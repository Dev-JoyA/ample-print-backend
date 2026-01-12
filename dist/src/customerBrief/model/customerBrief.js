import { Schema, model } from "mongoose";
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
}, { timestamps: true });
CustomerBriefSchema.index({ orderId: 1, productId: 1 }, { unique: true });
export const CustomerBrief = model("CustomerBrief", CustomerBriefSchema);
//# sourceMappingURL=customerBrief.js.map