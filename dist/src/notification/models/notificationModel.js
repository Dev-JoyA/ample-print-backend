import mongoose, { Schema } from "mongoose";
const NotificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    link: { type: String },
    createdAt: { type: Date, default: Date.now },
});
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
export const Notification = mongoose.model("Notification", NotificationSchema);
//# sourceMappingURL=notificationModel.js.map