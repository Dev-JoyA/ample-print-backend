import { Schema, model } from "mongoose";
const ProfileSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
    },
    firstName: {
        type: String,
        required: true,
        index: true,
    },
    lastName: {
        type: String,
        required: true,
        index: true,
    },
    userName: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    address: {
        type: String,
    },
}, {
    timestamps: true,
});
export const Profile = model("Profile", ProfileSchema);
//# sourceMappingURL=profileModel.js.map