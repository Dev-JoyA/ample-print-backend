import { Schema, model } from "mongoose";
export var FeedBackStatus;
(function (FeedBackStatus) {
    FeedBackStatus["Pending"] = "Pending";
    FeedBackStatus["Reviewed"] = "Reviewed";
    FeedBackStatus["Resolved"] = "Resolved";
})(FeedBackStatus || (FeedBackStatus = {}));
const FeedbackSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    designId: {
        type: Schema.Types.ObjectId,
        ref: "Design",
        required: false,
    },
    respondedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    message: {
        type: String,
        required: true,
    },
    attachment: [String],
    adminResponse: String,
    adminResponseAt: Date,
    status: {
        type: String,
        enum: Object.values(FeedBackStatus),
        default: FeedBackStatus.Pending,
    },
}, { timestamps: true });
export const Feedback = model("Feedback", FeedbackSchema);
//# sourceMappingURL=feedback.js.map