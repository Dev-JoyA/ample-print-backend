import { Document, model, Types, Schema } from "mongoose";

export enum ShippingMethod {
  Pickup = "pickup",
  Delivery = "delivery",
}

export enum ShippingStatus {
  Pending = "pending",
  Shipped = "shipped",
  Delivered = "delivered",
}

export interface IShipping extends Document {
  orderId: Types.ObjectId;
  shippingMethod: ShippingMethod;
  trackingNumber: string;
  status: ShippingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingSchema = new Schema<IShipping>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true, // ✅ One shipping record per order
      index: true,
    },
    shippingMethod: {
      type: String,
      enum: Object.values(ShippingMethod),
      required: true,
    },
    trackingNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ShippingStatus),
      default: ShippingStatus.Pending,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Index for status queries
ShippingSchema.index({ status: 1, createdAt: -1 });

export const Shipping = model<IShipping>("Shipping", ShippingSchema);