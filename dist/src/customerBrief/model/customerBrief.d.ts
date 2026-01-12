import { Document, Types } from "mongoose";
export interface ICustomerBrief extends Document {
    orderId: Types.ObjectId;
    productId: Types.ObjectId;
    designId: Types.ObjectId;
    image?: string;
    voiceNote?: string;
    video?: string;
    description?: string;
    logo?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const CustomerBrief: import("mongoose").Model<ICustomerBrief, {}, {}, {}, Document<unknown, {}, ICustomerBrief, {}, {}> & ICustomerBrief & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=customerBrief.d.ts.map