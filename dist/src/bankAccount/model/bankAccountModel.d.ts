import { Document, Types } from "mongoose";
export interface IBankAccount extends Document {
    accountName: string;
    accountNumber: string;
    bankName: string;
    isActive: boolean;
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const BankAccount: import("mongoose").Model<IBankAccount, {}, {}, {}, Document<unknown, {}, IBankAccount, {}, {}> & IBankAccount & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=bankAccountModel.d.ts.map