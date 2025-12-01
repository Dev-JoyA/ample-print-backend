import {Order, OrderStatus} from '../models/orderModel.js'
import {Design, IDesign} from "../models/designModel.js"
import {Server} from "socket.io"


export const uploadDesign = async (id: string, data: IDesign): Promise<IDesign> => {
    const order = await Order.findById(id).exec()
    if(!order){
        throw new Error("No Order found for this design");
    }
    if(order.isDepositPaid == false){
        throw new Error('Deposit have not been paid for this order')
    }

    if (order.status === OrderStatus.Approved) {
        throw new Error("Design cannot be uploaded for a completed order.");
    }

    if (order.status === OrderStatus.Delivered) {
        throw new Error("Design cannot be uploaded for a cancelled order.");
    }

    const lastDesign = await Design.findOne({ orderId: order._id }).sort({ version: -1 });
    const newVersion = lastDesign ? lastDesign.version + 1 : 1;

    if (!data.designUrl) {
        throw new Error("A design file must be uploaded.");
    }

    order.status = OrderStatus.DesignUploaded;
    await order.save()

    const design = Design.create({
        userId: order.userId,
        orderId: order._id,
        uploadedBy: data.uploadedBy,
        version : newVersion,
        isApproved : false,
        designUrl: data.designUrl,
        otherImage: data.otherImage
    })

    return design;
    
};
export const updateDesign = async () => {};
export const deleteDesign = async() => {};
export const approveDesign = async() => {};
export const getDesignById = async() => {};
export const getUserDesigns = async() => {};
export const getDesignsByOrderId = async() => {};
export const filterDesigns = async () => {};
export const getDesignByProductId = async () => {};
export const viewDesign = async () => {};