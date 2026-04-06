import { Types, Document } from "mongoose";
export declare enum PaymentStatus {
    Pending = "Pending",
    PartPayment = "PartPayment",
    Completed = "Completed",
    Failed = "Failed",
    Refunded = "Refunded"
}
export declare enum OrderStatus {
    Pending = "Pending",
    OrderReceived = "OrderReceived",
    FilesUploaded = "FilesUploaded",
    AwaitingInvoice = "AwaitingInvoice",
    InvoiceSent = "InvoiceSent",
    DesignUploaded = "DesignUploaded",
    UnderReview = "UnderReview",
    Approved = "Approved",
    AwaitingPartPayment = "AwaitingPartPayment",
    PartPaymentMade = "PartPaymentMade",
    InProduction = "InProduction",
    Completed = "Completed",
    AwaitingFinalPayment = "AwaitingFinalPayment",
    FinalPaid = "FinalPaid",
    ReadyForShipping = "ReadyForShipping",
    Shipped = "Shipped",
    Cancelled = "Cancelled",
    Delivered = "Delivered"
}
export interface IOrderItem {
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    price: number;
    productSnapshot?: {
        name?: string;
        description?: string;
        dimension?: {
            width: string;
            height: string;
        };
        minOrder?: number;
        material?: string;
    };
}
export interface IOrderModel extends Document {
    userId: Types.ObjectId;
    orderNumber: string;
    items: IOrderItem[];
    totalAmount: number;
    amountPaid: number;
    remainingBalance: number;
    requiredPaymentType?: "full" | "part";
    requiredDeposit?: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    invoiceId?: Types.ObjectId;
    shippingId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface OrderData {
    items: {
        productId: Types.ObjectId;
        quantity: number;
    }[];
}
export interface PaginatedOrder {
    order: IOrderModel[];
    total: number;
    page: number;
    limit: number;
}
export declare const Order: import("mongoose").Model<IOrderModel, {}, {}, {}, Document<unknown, {}, IOrderModel, {}, {}> & IOrderModel & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=orderModel.d.ts.map