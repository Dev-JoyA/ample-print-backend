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
}

const ShippingSchema = new Schema<IShipping>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
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
    },
  },
  { timestamps: true },
);

export const Shipping = model<IShipping>("Shipping", ShippingSchema);
