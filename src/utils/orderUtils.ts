import { OrderCounter } from "../order/model/orderCounterModel.js";

export const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();

  const counter = await OrderCounter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  const seqStr = counter.seq.toString().padStart(3, "0");
  return `ORD-${year}-${seqStr}`;
};
