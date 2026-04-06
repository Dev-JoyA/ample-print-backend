import { Schema, model } from "mongoose";
const BankAccountSchema = new Schema({
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, required: true, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
}, { timestamps: true });
BankAccountSchema.index({ isActive: 1 }, { partialFilterExpression: { isActive: true } });
export const BankAccount = model("BankAccount", BankAccountSchema);
//# sourceMappingURL=bankAccountModel.js.map