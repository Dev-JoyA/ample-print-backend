import { Types, Document, model, Schema } from "mongoose";
import { v4 as uuid } from 'uuid'

export enum PaymentStatus {
    Pending = "Pending",
    Completed = "Completed",
    Failed = "Failed"
}

export enum OrderStatus {
    Pending = "Pending",
    DepositPaid = "DepositPaid",
    DesignUploaded = "DesignUploaded",
    UnderReview = "UnderReview",
    Approved = "Approved",
    InvoiceSent = "InvoiceSent",
    FinalPaid = "FinalPaid",
    Ready = "Ready",
    Delivered = "Delivered"
}

export interface IOrderModel extends Document {
    userId: Types.ObjectId;
    orderNumber: string;
    items: {
        productId: Types.ObjectId;
        quantity: number;
        price: number;
    }[];
    deposit: number;
    totalAmount: number;
    isDepositPaid: boolean;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
}


const OrderSchema = new Schema<IOrderModel>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
            default: () => uuid()
        },
        items: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    ref: "Product",
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true
                },
                price: {
                    type: Number,
                    required: true
                }
            }
        ],

        deposit: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        isDepositPaid: {
            type: Boolean,
            default: false
        },  
        status: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.Pending
        },
        paymentStatus: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.Pending
        }
    },
    { 
        timestamps: true 
    }
);


export const Order = model<IOrderModel>("Order", OrderSchema);