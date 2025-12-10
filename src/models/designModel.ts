import { Document, Schema, Types, model } from "mongoose";

export interface IDesign extends Document {
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  productId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  version: number;
  isApproved: boolean;
  approvedAt?: Date;
  designUrl?: string;
  filename: string;
  otherImage?: string[];
  filenames: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DesignSchema = new Schema<IDesign>(
  {
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
  },
  {
    timestamps: true,
  },
);

export const Design = model<IDesign>("Design", DesignSchema);
