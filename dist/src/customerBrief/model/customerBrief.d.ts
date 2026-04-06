import { Document, Types } from "mongoose";
export declare enum CustomerBriefRole {
    Customer = "customer",
    Admin = "admin",
    SuperAdmin = "super-admin"
}
export interface ICustomerBrief extends Document {
    orderId: Types.ObjectId;
    role: CustomerBriefRole;
    productId: Types.ObjectId;
    designId?: Types.ObjectId;
    image?: string;
    voiceNote?: string;
    video?: string;
    description?: string;
    logo?: string;
    viewed: boolean;
    viewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateCustomerBriefDTO {
    orderId: Types.ObjectId;
    productId: Types.ObjectId;
    role?: CustomerBriefRole;
    designId?: Types.ObjectId;
    image?: string;
    voiceNote?: string;
    video?: string;
    description?: string;
    logo?: string;
}
export declare const CustomerBrief: import("mongoose").Model<ICustomerBrief, {}, {}, {}, Document<unknown, {}, ICustomerBrief, {}, {}> & ICustomerBrief & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=customerBrief.d.ts.map