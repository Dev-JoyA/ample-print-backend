import mongoose, { Schema, Document } from 'mongoose';

export interface IDiscount extends Document {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    code: {
      type: String,
      required: [true, 'Discount code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: [true, 'Discount type is required'],
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Value cannot be negative'],
    },
    active: {
      type: Boolean,
      default: true,
    },
    minOrderAmount: {
      type: Number,
      min: [0, 'Minimum order amount cannot be negative'],
    },
    maxDiscountAmount: {
      type: Number,
      min: [0, 'Maximum discount amount cannot be negative'],
    },
    validFrom: {
      type: Date,
    },
    validUntil: {
      type: Date,
    },
    usageLimit: {
      type: Number,
      min: [1, 'Usage limit must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
DiscountSchema.index({ code: 1 });
DiscountSchema.index({ active: 1, validFrom: 1, validUntil: 1 });

export const Discount = mongoose.model<IDiscount>('Discount', DiscountSchema);