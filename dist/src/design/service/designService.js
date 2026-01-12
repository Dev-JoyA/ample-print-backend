import { Order, OrderStatus } from "../../order/model/orderModel.js";
import { Design } from "../model/designModel.js";
import { User } from "../../users/model/userModel.js";
import { Profile } from "../../users/model/profileModel.js";
import emails from "../../utils/email.js";
import { Product } from "../../product/model/productModel.js";
export const uploadDesign = async (id, data, io) => {
    const order = await Order.findById(id).exec();
    if (!order) {
        throw new Error("No Order found for this design");
    }
    if (order.isDepositPaid == false) {
        throw new Error("Deposit have not been paid for this order");
    }
    if (order.status === OrderStatus.Completed) {
        throw new Error("Design cannot be uploaded for a completed order.");
    }
    if (order.status === OrderStatus.Cancelled) {
        throw new Error("Design cannot be uploaded for a cancelled order.");
    }
    if (order.status === OrderStatus.Delivered) {
        throw new Error("Design cannot be uploaded for a delivered order.");
    }
    const lastDesign = await Design.findOne({ orderId: order._id }).sort({
        version: -1,
    });
    const newVersion = lastDesign ? lastDesign.version + 1 : 1;
    if (!data.designUrl) {
        throw new Error("A design file must be uploaded.");
    }
    order.status = OrderStatus.DesignUploaded;
    await order.save();
    const design = await Design.create({
        userId: order.userId,
        orderId: order._id,
        productId: data.productId,
        uploadedBy: data.uploadedBy,
        version: newVersion,
        isApproved: false,
        designUrl: data.designUrl,
        otherImage: data.otherImage,
        createdAt: new Date(),
    });
    const user = await User.findById(order.userId).exec();
    if (!user) {
        throw new Error("User not found");
    }
    const profile = await Profile.findOne({ userId: user._id }).exec();
    if (!profile) {
        throw new Error("User not found");
    }
    io.to("superadmin-room").emit("designUploaded", {
        orderId: design.orderId,
        orderNumber: order.orderNumber,
        designUrl: design.designUrl,
        uploadedBy: design.uploadedBy,
    });
    const productInOrder = order.items.find((item) => item.productId.toString() === data.productId.toString());
    if (!productInOrder) {
        throw new Error("The selected product is not part of this order.");
    }
    const productName = productInOrder.productName;
    emails(user.email, "Design Uploaded", "Design for your Order have been uploaded", profile.firstName, `Hello ${profile.firstName},
        Your design for **${productName}** has been uploaded and is ready for your review.
        Order Number: ${order.orderNumber}
        Please log in to your dashboard to approve or request changes.`).catch((err) => console.error("Error sending email to notify customer of design upload", err));
    return design;
};
export const updateDesign = async (id, data, io) => {
    if (!data.productId) {
        throw new Error("productId is required for design upload.");
    }
    const updatedDesign = await Design.findByIdAndUpdate(id, { ...data }, { new: true, runValidators: true });
    if (!updatedDesign)
        throw new Error("Design not found");
    updatedDesign.updatedAt = new Date();
    await updatedDesign.save();
    const user = await User.findById(updatedDesign.userId).exec();
    if (!user) {
        throw new Error("User not found");
    }
    const profile = await Profile.findOne({ userId: user._id }).exec();
    const product = await Product.findOne({
        _id: updatedDesign.productId,
    }).exec();
    const order = await Order.findById(updatedDesign.orderId).exec();
    if (!profile || !order || !product) {
        throw new Error("Missing related profile/order/product data");
    }
    const productName = product.name;
    const orderNumber = order.orderNumber;
    emails(user.email, "Design Uploaded", "Design for your Order have been updated", profile.firstName, `Hello ${profile.firstName},
        Your design for **${productName}** has been uploaded and is ready for your review.
        Order Number: ${orderNumber}
        Please log in to your dashboard to approve or request changes.`).catch((err) => console.error("Error sending email to notify customer of design upload", err));
    io.to("superadmin-room").emit("designUploaded", {
        designId: updatedDesign._id,
        orderId: updatedDesign.orderId,
        orderNumber: orderNumber,
        designUrl: updatedDesign.designUrl,
        uploadedBy: updatedDesign.uploadedBy,
    });
    return updatedDesign;
};
export const deleteDesign = async (id) => {
    const design = await Design.findByIdAndDelete(id);
    if (!design)
        throw new Error("Design not found");
    return "Design deleted Successfully";
};
export const approveDesign = async (id) => {
    const design = await Design.findById(id);
    if (!design)
        throw new Error("Design not found");
    design.isApproved = true;
    design.approvedAt = new Date();
    await design.save();
    return design;
};
export const getDesignById = async (id) => {
    const design = await Design.findById(id);
    if (!design)
        throw new Error("Design not found");
    return design;
};
export const getUserDesigns = async (userId) => {
    const designs = await Design.find({ userId })
        .populate("orderId")
        .populate("productId")
        .sort({ createdAt: -1 })
        .exec();
    if (designs.length === 0) {
        throw new Error("This user has no designs.");
    }
    return designs;
};
export const getDesignsByOrderId = async (orderId) => {
    const designs = await Design.find({ orderId })
        .populate("productId")
        .sort({ version: -1 })
        .exec();
    if (designs.length === 0) {
        throw new Error("No designs found for this order.");
    }
    return designs;
};
export const filterDesigns = async (filters) => {
    const query = {};
    if (filters.userId)
        query.userId = filters.userId;
    if (filters.orderId)
        query.orderId = filters.orderId;
    if (filters.productId)
        query.productId = filters.productId;
    if (filters.uploadedBy)
        query.uploadedBy = filters.uploadedBy;
    if (filters.isApproved !== undefined)
        query.isApproved = filters.isApproved;
    if (filters.minVersion !== undefined || filters.maxVersion !== undefined) {
        query.version = {};
        if (filters.minVersion !== undefined)
            query.version.$gte = filters.minVersion;
        if (filters.maxVersion !== undefined)
            query.version.$lte = filters.maxVersion;
    }
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate)
            query.createdAt.$gte = filters.startDate;
        if (filters.endDate)
            query.createdAt.$lte = filters.endDate;
    }
    const designs = await Design.find(query)
        .populate("orderId")
        .populate("productId")
        .populate("uploadedBy")
        .sort({ createdAt: -1 });
    return designs;
};
export const getDesignByProductId = async (productId) => {
    const designs = await Design.find({ productId })
        .populate("orderId")
        .sort({ version: -1 })
        .exec();
    if (designs.length === 0) {
        throw new Error("No designs found for this product.");
    }
    return designs;
};
export const getAllDesigns = async () => {
    return Design.find()
        .populate("userId")
        .populate("orderId")
        .populate("productId")
        .populate("uploadedBy")
        .sort({ createdAt: -1 })
        .exec();
};
//# sourceMappingURL=designService.js.map