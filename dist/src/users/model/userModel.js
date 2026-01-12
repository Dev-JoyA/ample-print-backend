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
        required: true,
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
}, {
    timestamps: true,
});
export const User = model("User", UserSchema);
//# sourceMappingURL=userModel.js.map