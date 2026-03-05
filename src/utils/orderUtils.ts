import { OrderCounter } from "../order/model/orderCounterModel.js";

export const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();

  const counter = await OrderCounter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true } // Create if doesn't exist
  );

  const seqStr = counter.seq.toString().padStart(3, "0"); // e.g., 001, 002
  return `ORD-${year}-${seqStr}`;
};