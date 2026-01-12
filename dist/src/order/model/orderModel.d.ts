import { Types, Document } from "mongoose";
export declare enum PaymentStatus {
    Pending = "Pending",
    DepositPaid = "DepositPaid",
    PartPayment = "PartPayment",
    Completed = "Completed",
    Failed = "Failed",
    Refunded = "Refunded"
}
export declare enum OrderStatus {
    Pending = "Pending",
    OrderReceived = "OrderReceived",
    FilesUploaded = "FilesUploaded",
    InvoiceSent = "InvoiceSent",
    AwaitingDeposit = "AwaitingDeposit",
    DepositPaid = "DepositPaid",
    DesignUploaded = "DesignUploaded",
    UnderReview = "UnderReview",
    Approved = "Approved",
    AwaitingPartPayment = "AwaitingPartPayment",
    PartPaymentMade = "PartPaymentMade",
    InProduction = "InProduction",
    Completed = "Completed",
    AwaitingFinalPayment = "AwaitingFinalPayment",
    FinalPaid = "FinalPaid",
    Shipped = "Shipped",
    Cancelled = "Cancelled",
    Delivered = "Delivered"
}
export interface IOrderModel extends Document {
    userId: Types.ObjectId;
    orderNumber: string;
    items: {
        productId: Types.ObjectId;
        productName: string;
        quantity: number;
        price: number;
    }[];
    deposit: number;
    totalAmount: number;
    filename: string;
    amountPaid: number;
    remainingBalance: number;
    isDepositPaid: boolean;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
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