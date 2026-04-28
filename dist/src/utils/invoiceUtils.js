import { InvoiceCounter } from "../invoice/model/invoiceCounterModel.js";
export const generateInvoiceNumber = async () => {
    const year = new Date().getFullYear();
    const counter = await InvoiceCounter.findOneAndUpdate({ year }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const seqStr = counter.seq.toString().padStart(3, "0");
    return `INV-${year}-${seqStr}`;
};
//# sourceMappingURL=invoiceUtils.js.map