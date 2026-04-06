import { Document, Schema, model, Types } from "mongoose";

export interface IBankAccount extends Document {
  accountName: string;
  accountNumber: string;
  bankName: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, required: true, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true },
);

BankAccountSchema.index(
  { isActive: 1 },
  { partialFilterExpression: { isActive: true } },
);

export const BankAccount = model<IBankAccount>("BankAccount", BankAccountSchema);

