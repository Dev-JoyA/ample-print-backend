import {Document, Schema, Types, model} from 'mongoose';

export enum FeedBackStatus{
    Pending = "Pending",
    Reviewed = "Reviewed",
    Resolved = "Resolved"
}

export interface IFeedback extends Document {
    userId : Types.ObjectId;
    orderId : Types.ObjectId;
    designId : Types.ObjectId;
    respondedBy: Types.ObjectId;
    message : string;
    attachment : string[];
    adminResponse: String;
    adminResponseAt: Date;
    status : FeedBackStatus;
    createdAt : Date;
    updatedAt : Date;
}

const FeedbackSchema = new Schema<IFeedback>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true
        },
        designId: {
            type: Schema.Types.ObjectId,
            ref: "Design",
            required: false
        },
        respondedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        message: {
            type: String,
            required: true
        },
        attachment: [String],
        adminResponse: String,
        adminResponseAt: Date,
        status: {
            type: String,
            enum: Object.values(FeedBackStatus),
            default: FeedBackStatus.Pending
        }
    },
    { timestamps: true }
);

export const Feedback = model<IFeedback>("Feedback", FeedbackSchema);
