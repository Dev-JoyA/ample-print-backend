import { Schema, model } from "mongoose";

const orderCounterSchema = new Schema({
  year: { type: Number, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const OrderCounter = model("OrderCounter", orderCounterSchema);