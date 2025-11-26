import {Document, Types, Schema, model} from 'mongoose';

export interface IOrderFile extends Document {
    orderId : Types.ObjectId;
    designId : Types.ObjectId;
    image? : string;
    voiceNote? : string;
    video? : string;
    createdAt : Date;
    updatedAt : Date;
}

const OrderFileSchema = new Schema<IOrderFile>(
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


export const OrderFile = model<IOrderFile>("OrderFile", OrderFileSchema);