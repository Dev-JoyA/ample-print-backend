import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  readAt?: Date;
  link?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
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

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);
