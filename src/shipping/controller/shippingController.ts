import { Request, Response } from "express";
import * as shippingService from "../service/shippingService.js";
import { ShippingStatus, ShippingMethod } from "../model/shippingModel.js";

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

export const createShipping = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const admin = req.user as { _id: string; role: string };
    const { orderId } = req.params as { orderId: string };
    const { shippingMethod, address, pickupNotes } = req.body;

    if (!shippingMethod) {
      return res.status(400).json({
        success: false,
        message: "shippingMethod is required",
      });
    }

    if (!Object.values(ShippingMethod).includes(shippingMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shipping method",
      });
    }

    const shipping = await shippingService.createShipping(
      orderId,
      {
        shippingMethod,
        address,
        pickupNotes,
      },
      admin._id,
      io,
    );

    res.status(201).json({
      success: true,
      message: "Shipping created successfully",
      data: shipping,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateShippingTracking = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const user = req.user as { _id: string; role: string };
    const { shippingId } = req.params as { shippingId: string };
    const {
      trackingNumber,
      carrier,
      driverName,
      driverPhone,
      estimatedDelivery,
    } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: "Tracking number is required",
      });
    }

    const shipping = await shippingService.updateShippingTracking(
      shippingId,
      {
        trackingNumber,
        carrier,
        driverName,
        driverPhone,
        estimatedDelivery: estimatedDelivery
          ? new Date(estimatedDelivery)
          : undefined,
      },
      user._id,
      io,
    );

    res.status(200).json({
      success: true,
      message: "Tracking information updated successfully",
      data: shipping,
    });
  } catch (error: any) {
    console.error("Error updating tracking:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateShippingStatus = async (req: Request, res: Response) => {
  try {
    const io = getIO(req);
    const admin = req.user as { _id: string; role: string };
    const { shippingId } = req.params as { shippingId: string };
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!Object.values(ShippingStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const shipping = await shippingService.updateShippingStatus(
      shippingId,
      status,
      admin._id,
      io,
    );

    res.status(200).json({
      success: true,
      message: "Shipping status updated successfully",
      data: shipping,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getShippingById = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const { shippingId } = req.params as { shippingId: string };

    const shipping = await shippingService.getShippingById(
      shippingId,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: shipping,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getShippingByOrderId = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const { orderId } = req.params as { orderId: string };

    const shipping = await shippingService.getShippingByOrderId(
      orderId,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: shipping,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllShipping = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await shippingService.getAllShipping(page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const filterShipping = async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as ShippingStatus,
      method: req.query.method as ShippingMethod,
      orderId: req.query.orderId as string,
      userId: req.query.userId as string,
      isPaid:
        req.query.isPaid === "true"
          ? true
          : req.query.isPaid === "false"
            ? false
            : undefined,
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };

    const result = await shippingService.filterShipping(filters);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getShippingNeedingInvoice = async (
  req: Request,
  res: Response,
) => {
  try {
    const shipping = await shippingService.getShippingNeedingInvoice();

    res.status(200).json({
      success: true,
      data: shipping,
      count: shipping.length,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPendingShipping = async (req: Request, res: Response) => {
  try {
    const shipping = await shippingService.getPendingShipping();

    res.status(200).json({
      success: true,
      data: shipping,
      count: shipping.length,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
