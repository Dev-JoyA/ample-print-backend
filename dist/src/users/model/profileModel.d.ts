import { Document, Types } from "mongoose";
export interface IProfile extends Document {
    userId: Types.ObjectId;
    firstName: string;
    lastName: string;
    userName: string;
    phoneNumber: string;
    address?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Profile: import("mongoose").Model<IProfile, {}, {}, {}, Document<unknown, {}, IProfile, {}, {}> & IProfile & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=profileModel.d.ts.map