import { Document, Types, Schema, model } from "mongoose";

export enum CustomerBriefRole {
  Customer = "customer",
  Admin = "admin",
  SuperAdmin = "super-admin",
}

export enum CustomerBriefStatus {
  Pending = "pending",
  Responded = "responded",
  Complete = "complete"
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
  viewed: boolean;
  viewedAt?: Date;
  adminViewed?: boolean;
  adminViewedAt?: Date;
  status: CustomerBriefStatus;
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
  },
  { timestamps: true },
);

CustomerBriefSchema.index({ orderId: 1, productId: 1, role: 1 });
CustomerBriefSchema.index({ orderId: 1 });
CustomerBriefSchema.index({ role: 1, createdAt: -1 });
CustomerBriefSchema.index({ status: 1 });
CustomerBriefSchema.index({ 
  role: 1, 
  status: 1, 
  viewed: 1, 
  createdAt: -1 
});

export const CustomerBrief = model<ICustomerBrief>(
  "CustomerBrief",
  CustomerBriefSchema,
);