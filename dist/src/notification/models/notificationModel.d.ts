import mongoose, { Document } from "mongoose";
export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    type: string;
    title: string;
    message: string;
    data?: any;
    read: boolean;
    readAt?: Date;
    link?: string;
    createdAt: Date;
}
export declare const Notification: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=notificationModel.d.ts.map