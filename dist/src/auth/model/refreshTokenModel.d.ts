import { Schema, Document, Types } from "mongoose";
export interface IRefreshToken extends Document {
    userId: Types.ObjectId;
    token: string;
    expiresAt: Date;
}
export declare const RefreshToken: import("mongoose").Model<IRefreshToken, {}, {}, {}, Document<unknown, {}, IRefreshToken, {}, import("mongoose").DefaultSchemaOptions> & IRefreshToken & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, Schema<IRefreshToken, import("mongoose").Model<IRefreshToken, any, any, any, Document<unknown, any, IRefreshToken, any, {}> & IRefreshToken & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IRefreshToken, Document<unknown, {}, import("mongoose").FlatRecord<IRefreshToken>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<IRefreshToken> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>>;
//# sourceMappingURL=refreshTokenModel.d.ts.map