import * as orderService from "../service/orderService.js";
import { Request, Response } from "express";
import {
  OrderData,
  IOrderModel,
  OrderStatus,
  PaymentStatus,
} from "../model/orderModel.js";

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const user = req.user as { _id: string; role: string };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const data: OrderData = req.body;
    const order = await orderService.createOrder(user._id, data, io);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== UPDATE ORDER ====================
export const updateOrder = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const data: Partial<IOrderModel> = req.body;
    const user = req.user as { _id: string; role: string };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Remove id from data if present
    delete data._id;
    delete data.id;

    const order = await orderService.updateOrder(
      orderId,
      data,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== DELETE ORDER ====================
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const user = req.user as { _id: string; role: string };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const response = await orderService.deleteOrder(
      orderId,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      message: response,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== GET ORDER BY ID ====================
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const user = req.user as { _id: string; role: string };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const order = await orderService.getOrderById(orderId, user._id, user.role);

    res.status(200).json({
      success: true,
      order,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== GET USER ORDERS ====================
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await orderService.getUserOrders(user._id, page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== GET ALL ORDERS (Admin) ====================
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await orderService.getAllOrders(user.role, page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== SEARCH BY ORDER NUMBER ====================
export const searchByOrderNumber = async (req: Request, res: Response) => {
  try {
    const orderNumber = req.params.orderNumber;
    const user = req.user as { _id: string; role: string };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const order = await orderService.searchByOrderNumber(
      orderNumber,
      user.role,
    );

    res.status(200).json({
      success: true,
      order,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== UPDATE ORDER STATUS ====================
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const orderId = req.params.id;
    const { status } = req.body;
    const user = req.user as { _id: string; role: string };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const order = await orderService.updateOrderStatus(
      orderId,
      status,
      user._id,
      user.role,
      io,
    );

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== FILTER ORDERS ====================
export const filterOrders = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const filters = {
      status: req.query.status as OrderStatus,
      paymentStatus: req.query.paymentStatus as PaymentStatus,
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
      minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
      maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
      userId: req.query.userId as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };

    const result = await orderService.filterOrders(filters, user.role);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== GET ORDERS NEEDING INVOICE ====================
export const getOrdersNeedingInvoice = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const orders = await orderService.getOrdersNeedingInvoice(user.role);

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==================== SUPER ADMIN CREATE ORDER ====================
export const superAdminCreateOrder = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const { customerId } = req.params;
    const data: OrderData = req.body;
    const user = req.user as { _id: string; role: string };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Only super admin can use this
    if (user.role !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "Only super admin can create orders for customers",
      });
    }

    const order = await orderService.superAdminCreateOrder(
      customerId,
      data,
      user._id,
      io,
    );

    res.status(201).json({
      success: true,
      message: "Order created for customer",
      order,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
