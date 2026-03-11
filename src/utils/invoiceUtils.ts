import { InvoiceCounter } from "../invoice/model/invoiceCounterModel.js";

export const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();

  const counter = await InvoiceCounter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true } // Create if doesn't exist
  );

  const seqStr = counter.seq.toString().padStart(3, "0"); // e.g., 001, 002
  return `INV-${year}-${seqStr}`;
};