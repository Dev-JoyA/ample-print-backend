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
  orderNumber: string; // For easy reference without populating
  shippingMethod: ShippingMethod;

  // For delivery orders
  trackingNumber?: string; // Optional (for pickup)
  recipientName?: string; // From profile - cannot be changed by customer
  recipientPhone?: string; // From profile - cannot be changed by customer
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };

  // Cost and invoice
  shippingCost: number;
  shippingInvoiceId?: Types.ObjectId;
  isPaid: boolean;

  // Status
  status: ShippingStatus;

  // Tracking history (optional but useful)
  trackingHistory?: Array<{
    status: ShippingStatus;
    location?: string;
    description?: string;
    timestamp: Date;
  }>;

  // Dates
  estimatedDelivery?: Date;
  actualDelivery?: Date;

  // Metadata for internal use
  metadata?: {
    createdBy?: Types.ObjectId;
    pickupNotes?: string;
    carrier?: string;
    [key: string]: any;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ShippingSchema = new Schema<IShipping>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true, // One shipping record per order
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    shippingMethod: {
      type: String,
      enum: Object.values(ShippingMethod),
      required: true,
    },

    // For delivery orders (optional for pickup)
    trackingNumber: {
      type: String,
      sparse: true, // Allows null/undefined for pickup
    },
    recipientName: {
      type: String,
      required: function (this: IShipping) {
        return this.shippingMethod === ShippingMethod.Delivery;
      },
    },
    recipientPhone: {
      type: String,
      required: function (this: IShipping) {
        return this.shippingMethod === ShippingMethod.Delivery;
      },
    },
    address: {
      street: {
        type: String,
        required: function (this: IShipping) {
          return this.shippingMethod === ShippingMethod.Delivery;
        },
      },
      city: {
        type: String,
        required: function (this: IShipping) {
          return this.shippingMethod === ShippingMethod.Delivery;
        },
      },
      state: {
        type: String,
        required: function (this: IShipping) {
          return this.shippingMethod === ShippingMethod.Delivery;
        },
      },
      country: {
        type: String,
        required: function (this: IShipping) {
          return this.shippingMethod === ShippingMethod.Delivery;
        },
        default: "Nigeria",
      },
      postalCode: String,
    },

    // Cost and invoice
    shippingCost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    shippingInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(ShippingStatus),
      default: ShippingStatus.Pending,
      required: true,
      index: true,
    },

    // Tracking history
    trackingHistory: [
      {
        status: {
          type: String,
          enum: Object.values(ShippingStatus),
          required: true,
        },
        location: String,
        description: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Dates
    estimatedDelivery: Date,
    actualDelivery: Date,

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

// Conditional validation: ensure all required fields for delivery
ShippingSchema.pre("validate", function (next) {
  if (this.shippingMethod === ShippingMethod.Delivery) {
    if (!this.recipientName) {
      next(new Error("Recipient name is required for delivery"));
    }
    if (!this.recipientPhone) {
      next(new Error("Recipient phone is required for delivery"));
    }
    if (!this.address?.street || !this.address?.city || !this.address?.state) {
      next(new Error("Complete address is required for delivery"));
    }
  }
  next();
});

// Indexes for performance
ShippingSchema.index({ status: 1, createdAt: -1 });
ShippingSchema.index({ trackingNumber: 1 }, { sparse: true });
ShippingSchema.index({ shippingInvoiceId: 1 });
ShippingSchema.index({ orderNumber: 1 });

export const Shipping = model<IShipping>("Shipping", ShippingSchema);
