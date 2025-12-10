import { Document, Schema, model, Types } from "mongoose";
import { ICollection } from "./productInterface.js";

const CollectionSchema = new Schema<ICollection>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Collection = model<ICollection>("Collection", CollectionSchema);
