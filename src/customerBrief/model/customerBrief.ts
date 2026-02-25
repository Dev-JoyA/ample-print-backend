import { Document, Types, Schema, model } from "mongoose";

export enum CustomerBriefRole {
  Customer = "customer",
  Admin = "admin",
  SuperAdmin = "super-admin",
}
export interface ICustomerBrief extends Document {
  orderId: Types.ObjectId;
  role: CustomerBriefRole;
  productId: Types.ObjectId;
  designId?: Types.ObjectId;
  image?: string;
  voiceNote?: string;
  video?: string;
  description?: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerBriefDTO {
  orderId: Types.ObjectId;
  productId: Types.ObjectId;
  role?: CustomerBriefRole;
  designId?: Types.ObjectId;
  image?: string;
  voiceNote?: string;
  video?: string;
  description?: string;
  logo?: string;
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
  },
  { timestamps: true },
);

CustomerBriefSchema.index(
  { orderId: 1, productId: 1, role: 1 },
  { unique: true },
);

CustomerBriefSchema.index({ orderId: 1 });

CustomerBriefSchema.index({ role: 1, createdAt: -1 });

export const CustomerBrief = model<ICustomerBrief>(
  "CustomerBrief",
  CustomerBriefSchema,
);
