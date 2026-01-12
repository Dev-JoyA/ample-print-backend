import { Schema, model } from "mongoose";
const refreshTokenSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    token: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
});
export const RefreshToken = model("RefreshToken", refreshTokenSchema);
//# sourceMappingURL=refreshTokenModel.js.map