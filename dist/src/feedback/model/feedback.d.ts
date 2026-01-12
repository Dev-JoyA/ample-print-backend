import { Document, Types } from "mongoose";
export declare enum FeedBackStatus {
    Pending = "Pending",
    Reviewed = "Reviewed",
    Resolved = "Resolved"
}
export interface IFeedback extends Document {
    userId: Types.ObjectId;
    orderId: Types.ObjectId;
    designId: Types.ObjectId;
    respondedBy: Types.ObjectId;
    message: string;
    attachment: string[];
    adminResponse: string;
    adminResponseAt: Date;
    status: FeedBackStatus;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Feedback: import("mongoose").Model<IFeedback, {}, {}, {}, Document<unknown, {}, IFeedback, {}, {}> & IFeedback & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=feedback.d.ts.map