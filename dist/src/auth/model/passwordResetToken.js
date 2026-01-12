import { Schema, model } from "mongoose";
const PasswordResetTokenSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, {
    timestamps: false,
});
export const PasswordResetToken = model("PasswordResetToken", PasswordResetTokenSchema);
//# sourceMappingURL=passwordResetToken.js.map