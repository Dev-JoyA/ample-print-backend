import { Document, Types } from "mongoose";
export interface IPasswordResetToken extends Document {
    userId: Types.ObjectId;
    token: string;
    expiresAt: Date;
}
export declare const PasswordResetToken: import("mongoose").Model<IPasswordResetToken, {}, {}, {}, Document<unknown, {}, IPasswordResetToken, {}, {}> & IPasswordResetToken & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=passwordResetToken.d.ts.map