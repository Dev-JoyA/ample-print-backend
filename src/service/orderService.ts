import { User, UserRole } from "../models/userModel.js";
import {
  OrderData,
  OrderStatus,
  Order,
  PaymentStatus,
  IOrderModel,
} from "../models/orderModel.js";
import { Product } from "../models/productModel.js";
import { Profile } from "../models/profileModel.js";
import { Server } from "socket.io";
import emails from "../utils/email.js";

export const createOrder = async (
  id: string,
  data: OrderData,
  io: Server,
): Promise<IOrderModel> => {
  const user = await User.findById(id);

  if (!user) throw new Error("User not found");

  if (user.role === UserRole.Admin)
    throw new Error("Admin cannot create an order");

  const newOrder = data.items;

  if (!newOrder || newOrder.length == 0) {
    throw new Error("You must select at least one product to create an order");
  }

  const seenProductIds = new Set<string>();
  const orderItems = [];
  let totalAmount = 0;

  const productIds = newOrder.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  for (const item of newOrder) {
    const product = productMap.get(item.productId.toString());
    const productId = item.productId.toString();

    if (seenProductIds.has(productId)) {
      throw new Error("You cannot order the same product multiple times");
    }

    seenProductIds.add(productId);

    if (!product) {
      throw new Error(`Product not found`);
    }

    if (item.quantity < product.minOrder) {
      throw new Error(
        `${product.name} minimum order quantity is ${product.minOrder}`,
      );
    }

    orderItems.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
    });
    totalAmount += product.price * item.quantity;
  }

  const order = await Order.create({
    userId: user._id,
    items: orderItems,
    deposit: 0.3 * totalAmount,
    totalAmount: totalAmount,
    amountPaid: 0,
    remainingBalance: totalAmount - 0.3 * totalAmount,
    isDepositPaid: false,
    status: OrderStatus.OrderReceived,
    paymentStatus: PaymentStatus.Pending,
    createdAt: new Date(),
  });

  const profile = await Profile.findOne({ userId: user._id }).exec();
  if (!profile) {
    throw new Error("User not found");
  }

  io.to("superadmin-room").emit("new-order", {
    orderId: order._id,
    orderNumber: order.orderNumber,
  });

  io.to("admin-room").emit("new-order", {
    orderId: order._id,
    orderNumber: order.orderNumber,
  });

  emails(
    user.email,
    `New Order created ${order.orderNumber} `,
    "You have created a new Order",
    profile.firstName,
    `Hello ${profile.firstName},
            Your order with ORDER NUMBER :  **${order.orderNumber}** have been created.
            Order Number: ${order.orderNumber}
            Please log in to your dashboard to track your order and expect a follow up email for your invoice `,
  ).catch((err) =>
    console.error("Error sending order confirmation email", err),
  );

  return order;
};

export const updateOrder = async () => {};
export const deleteOrder = async () => {};
export const trackOrder = async () => {};
export const getOrderById = async () => {};
export const getUserOrder = async () => {};
export const filterOrder = async () => {};
export const completeOrder = async () => {};
export const PaginatedOrder = async () => {};
