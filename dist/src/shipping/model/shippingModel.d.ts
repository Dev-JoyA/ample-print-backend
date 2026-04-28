import { Document, Types } from "mongoose";
export declare enum ShippingMethod {
    Pickup = "pickup",
    Delivery = "delivery"
}
export declare enum ShippingStatus {
    Pending = "pending",
    Shipped = "shipped",
    Delivered = "delivered"
}
export interface IShipping extends Document {
    orderId: Types.ObjectId;
    orderNumber: string;
    shippingMethod: ShippingMethod;
    trackingNumber?: string;
    carrier?: string;
    recipientName?: string;
    recipientPhone?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        country: string;
    };
    shippingCost?: number;
    shippingInvoiceId?: Types.ObjectId;
    isPaid: boolean;
    status: ShippingStatus;
    trackingHistory?: Array<{
        status: ShippingStatus;
        location?: string;
        description?: string;
        timestamp: Date;
    }>;
    estimatedDelivery?: Date;
    actualDelivery?: Date;
    driverName?: string;
    driverPhone?: string;
    metadata?: {
        createdBy?: Types.ObjectId;
        pickupNotes?: string;
        carrier?: string;
        [key: string]: any;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Shipping: import("mongoose").Model<IShipping, {}, {}, {}, Document<unknown, {}, IShipping, {}, {}> & IShipping & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=shippingModel.d.ts.map