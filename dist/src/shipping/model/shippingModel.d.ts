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
    shippingMethod: ShippingMethod;
    trackingNumber: string;
    status: ShippingStatus;
}
export declare const Shipping: import("mongoose").Model<IShipping, {}, {}, {}, Document<unknown, {}, IShipping, {}, {}> & IShipping & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=shippingModel.d.ts.map