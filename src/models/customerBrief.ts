import {Document, Types, Schema, model} from 'mongoose';

export interface ICustomerBrief extends Document {
    orderId : Types.ObjectId;
    designId : Types.ObjectId;
    image? : string;
    voiceNote? : string;
    video? : string;
    createdAt : Date;
    updatedAt : Date;
}

const CustomerBriefSchema = new Schema<ICustomerBrief>(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true
        },
        designId: {
            type: Schema.Types.ObjectId,
            ref: "Design",
            required: false,
            index: true
        },
        image: String,
        voiceNote: String,
        video: String
    },
    { timestamps: true }
);


export const CustomerBrief = model<ICustomerBrief>("CustomerBrief", CustomerBriefSchema);