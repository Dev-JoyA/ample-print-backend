import { IInvoice, Invoice, InvoiceStatus } from "../model/invoiceModel.js" ;
import {Order} from "../../order/model/orderModel.js"
import { User } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import emails from "../../utils/email.js";


export const createInvoice = async (orderId: string, data: IInvoice) : Promise<IInvoice> => {
    const order = await Order.findById(orderId).exec();
    if(!order) {
        throw new Error("Order not found for creating invoice");
    }
    const existingInvoice = await Invoice.findOne({ orderId: order._id }).exec();
    if (existingInvoice) {
        throw new Error("Invoice already exists for this order");
    }

    const invoiceData = await Invoice.create({
        orderId: order._id,
        items: order.items.map(item => ({
            description: item.productName,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.quantity * item.price
        })),
        totalAmount: order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
        depositAmount: 0,
        partPaymentAmount: 0,
        remainingAmount: 0,
        discount: data.discount || 0,
        status: InvoiceStatus.Draft
    });

    const user = await User.findById(order.userId).exec();
    
    if (!user) throw new Error("User not found");

    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile) {
        throw new Error("User not found");
    }

    emails(
        user.email,
        `Invoice created for ${order.orderNumber} `,
        "You have a new invoice created",
        profile.firstName,
        `Hello ${profile.firstName},
                Your Invoice for ORDER NUMBER :  **${order.orderNumber}** have been created.
                Please log in to your dashboard to view your invoice `
    ).catch((err) =>
        console.error("Error sending order confirmation email", err)
    );
    
    return invoiceData;
};
export const updateInvoice = async () => {

};
export const deleteInvoice = async () => {}
;
export const getAllInvoice = async () => {
    
};
export const getInvoiceByOrderId = async () => {};
export const getUserInvoices = async () => {};
export const filterInvoices = async () => {};
