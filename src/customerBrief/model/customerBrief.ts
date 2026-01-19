import { Document, Types, Schema, model } from "mongoose";

export interface ICustomerBrief extends Document {
  orderId: Types.ObjectId;
  productId: Types.ObjectId;
  designId: Types.ObjectId;
  image?: string;
  voiceNote?: string;
  video?: string;
  description?: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerBriefSchema = new Schema<ICustomerBrief>(
  {
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
  },
  { timestamps: true },
);

CustomerBriefSchema.index({ orderId: 1, productId: 1 }, { unique: true });

export const CustomerBrief = model<ICustomerBrief>(
  "CustomerBrief",
  CustomerBriefSchema,
);
