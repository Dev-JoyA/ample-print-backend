import * as designService from "../service/designService.js";
import { Request, Response } from "express";
import { IDesign } from "../model/designModel.js";
import { Types } from "mongoose";

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

const getParam = (param: string | string[]) =>
  Array.isArray(param) ? param[0] : param;

export const createDesignController = async (req: Request, res: Response) => {
  try {
    const orderId = getParam(req.params.orderId);
    console.log("🔍 Controller - Received orderId:", orderId);
    console.log("🔍 Controller - orderId type:", typeof orderId);
    console.log("🔍 Controller - orderId length:", orderId.length);

    const admin = req.user as { _id: string; fullname: string };
    const files = req.files as Express.Multer.File[];
    const io = getIO(req);

    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one image is required." });
    }

    const { productId } = req.body;
    console.log("🔍 Controller - productId:", productId);

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "productId is required." });
    }

    const data: Partial<IDesign> = {
      productId: new Types.ObjectId(productId),
      uploadedBy: new Types.ObjectId(admin._id),
      designUrl: `/uploads/${files[0].filename}`,
      filename: files[0].filename,
      otherImage: files.map((file) => `/uploads/${file.filename}`),
      filenames: files.map((file) => file.filename),
    };

    console.log("🔍 Controller - Calling uploadDesign with orderId:", orderId);
    const design = await designService.uploadDesign(
      orderId,
      data as IDesign,
      io,
    );

    const populatedDesign = await design.populate(
      "uploadedBy",
      "fullname email",
    );

    res.status(201).json({
      success: true,
      message: "Design uploaded successfully",
      data: populatedDesign,
    });
  } catch (error: any) {
    console.error("❌ Controller error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatedDesignController = async (req: Request, res: Response) => {
  try {
    const orderId = getParam(req.params.orderId);
    const admin = req.user as { _id: string; fullname: string };
    const files = req.files as Express.Multer.File[];
    const io = getIO(req);

    const updatedData: Partial<IDesign> = {
      ...req.body,
      uploadedBy: new Types.ObjectId(admin._id),
    };

    if (req.body.productId) {
      updatedData.productId = new Types.ObjectId(req.body.productId);
    }

    if (files && files.length > 0) {
      updatedData.designUrl = `/uploads/${files[0].filename}`;
      updatedData.filename = files[0].filename;
      updatedData.otherImage = files.map((file) => `/uploads/${file.filename}`);
      updatedData.filenames = files.map((file) => file.filename);
    }

    const update = await designService.updateDesign(orderId, updatedData, io);
    const populateDesign = await update.populate(
      "uploadedBy",
      "fullname email",
    );

    res.status(200).json({
      success: true,
      message: "Design updated successfully",
      data: populateDesign,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteDesignController = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id);
    const message = await designService.deleteDesign(id);
    res.status(200).json({
      success: true,
      message,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const approveDesignController = async (req: Request, res: Response) => {
  try {
    const designId = getParam(req.params.designId);
    const design = await designService.approveDesign(designId);
    res.status(200).json({
      success: true,
      message: "Design approved successfully",
      data: design,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getDesignByIdController = async (req: Request, res: Response) => {
  try {
    const designId = getParam(req.params.designId);
    const design = await designService.getDesignById(designId);
    res.status(200).json({
      success: true,
      data: design,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getUserDesignsController = async (req: Request, res: Response) => {
  try {
    const userId = getParam(req.params.userId);
    const designs = await designService.getUserDesigns(userId);
    res.status(200).json({
      success: true,
      data: designs,
      count: designs.length,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getDesignByOrderIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = getParam(req.params.orderId);
    const designs = await designService.getDesignsByOrderId(id);
    res.status(200).json({
      success: true,
      data: designs,
      count: designs.length,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getDesignByProductIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const productId = getParam(req.params.productId);
    const designs = await designService.getDesignByProductId(productId);
    res.status(200).json({
      success: true,
      data: designs,
      count: designs.length,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllDesignsController = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const designs = await designService.getAllDesigns();

    const start = (page - 1) * limit;
    const paginatedDesigns = designs.slice(start, start + limit);

    res.status(200).json({
      success: true,
      data: paginatedDesigns,
      total: designs.length,
      page,
      limit,
      pages: Math.ceil(designs.length / limit),
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const filterDesignController = async (req: Request, res: Response) => {
  try {
    const filters: designService.IDesignFilter = {
      userId: req.query.userId as string,
      orderId: req.query.orderId as string,
      productId: req.query.productId as string,
      uploadedBy: req.query.uploadedBy as string,
      isApproved: req.query.isApproved === "true",
      minVersion: req.query.minVersion
        ? parseInt(req.query.minVersion as string)
        : undefined,
      maxVersion: req.query.maxVersion
        ? parseInt(req.query.maxVersion as string)
        : undefined,
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
    };

    const designs = await designService.filterDesigns(filters);
    res.status(200).json({
      success: true,
      data: designs,
      count: designs.length,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
