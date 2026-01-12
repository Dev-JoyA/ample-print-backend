import { Document } from "mongoose";
export declare enum UserRole {
    Customer = "Customer",
    Admin = "Admin",
    SuperAdmin = "SuperAdmin"
}
export interface IUser extends Document {
    email: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=userModel.d.ts.map