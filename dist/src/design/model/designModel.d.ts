import { Document, Types } from "mongoose";
export interface IDesign extends Document {
    userId: Types.ObjectId;
    orderId: Types.ObjectId;
    productId: Types.ObjectId;
    uploadedBy: Types.ObjectId;
    version: number;
    isApproved: boolean;
    approvedAt?: Date;
    designUrl?: string;
    filename: string;
    otherImage?: string[];
    filenames: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Design: import("mongoose").Model<IDesign, {}, {}, {}, Document<unknown, {}, IDesign, {}, {}> & IDesign & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=designModel.d.ts.map