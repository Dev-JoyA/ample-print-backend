import { Schema, model } from "mongoose";
const invoiceCounterSchema = new Schema({
    year: { type: Number, required: true, unique: true },
    seq: { type: Number, default: 0 },
});
export const InvoiceCounter = model("InvoiceCounter", invoiceCounterSchema);
//# sourceMappingURL=invoiceCounterModel.js.map