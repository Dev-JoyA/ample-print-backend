import { Schema, Document, model, Types } from "mongoose";

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
});

export const RefreshToken = model("RefreshToken", refreshTokenSchema);
