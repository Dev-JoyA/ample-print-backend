import { Schema, model } from "mongoose";
export var UserRole;
(function (UserRole) {
    UserRole["Customer"] = "Customer";
    UserRole["Admin"] = "Admin";
    UserRole["SuperAdmin"] = "SuperAdmin";
})(UserRole || (UserRole = {}));
const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    password: {
        type: String,
        required: function () {
            return !this.googleId;
        },
    },
    role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.Customer,
        index: true,
    },
    isActive: {
        type: Boolean,
        index: true,
        required: true,
    },
    googleId: {
        type: String,
        sparse: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
UserSchema.virtual("profile", {
    ref: "Profile",
    localField: "_id",
    foreignField: "userId",
    justOne: true,
});
export const User = model("User", UserSchema);
//# sourceMappingURL=userModel.js.map