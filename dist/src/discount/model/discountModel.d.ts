import mongoose, { Document } from "mongoose";
export interface IDiscount extends Document {
    code: string;
    type: "percentage" | "fixed";
    value: number;
    active: boolean;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    validFrom?: Date;
    validUntil?: Date;
    usageLimit?: number;
    usedCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Discount: mongoose.Model<IDiscount, {}, {}, {}, mongoose.Document<unknown, {}, IDiscount, {}, {}> & IDiscount & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=discountModel.d.ts.map