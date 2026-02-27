import * as designService from "../service/designService.js";
import { Request, Response } from "express";
import { IDesign } from "../model/designModel.js";
import { Types } from "mongoose"; // ✅ Add this import

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

export const createDesignController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // This is orderId
    const admin = req.user as { _id: string; fullname: string };
    const files = req.files as Express.Multer.File[];
    const io = getIO(req);

    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one image is required." });
    }

    const { productId } = req.body;
    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "productId is required." });
    }

    // ✅ FIX: Convert string IDs to ObjectId
    const data: Partial<IDesign> = {
      productId: new Types.ObjectId(productId), // Convert to ObjectId
      uploadedBy: new Types.ObjectId(admin._id), // Convert to ObjectId
      designUrl: `/uploads/${files[0].filename}`,
      filename: files[0].filename,
      otherImage: files.map((file) => `/uploads/${file.filename}`),
      filenames: files.map((file) => file.filename),
    };

    const design = await designService.uploadDesign(id, data as IDesign, io);
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
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatedDesignController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // This is designId
    const admin = req.user as { _id: string; fullname: string };
    const files = req.files as Express.Multer.File[];
    const io = getIO(req);

    // ✅ FIX: Convert string IDs to ObjectId
    const updatedData: Partial<IDesign> = {
      ...req.body,
      uploadedBy: new Types.ObjectId(admin._id), // Convert to ObjectId
    };

    // Convert productId if provided
    if (req.body.productId) {
      updatedData.productId = new Types.ObjectId(req.body.productId);
    }

    // Only update files if new ones are provided
    if (files && files.length > 0) {
      updatedData.designUrl = `/uploads/${files[0].filename}`;
      updatedData.filename = files[0].filename;
      updatedData.otherImage = files.map((file) => `/uploads/${file.filename}`);
      updatedData.filenames = files.map((file) => file.filename);
    }

    const update = await designService.updateDesign(id, updatedData, io);
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
    const { id } = req.params;
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
    const { id } = req.params;
    const design = await designService.approveDesign(id);
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
    const { id } = req.params;
    const design = await designService.getDesignById(id);
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
    const { id } = req.params; // userId
    const designs = await designService.getUserDesigns(id);
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
    const { id } = req.params; // orderId
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
    const { id } = req.params; // productId
    const designs = await designService.getDesignByProductId(id);
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
    // ✅ Add pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const designs = await designService.getAllDesigns();

    // Simple pagination (you might want to add this to service)
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
    // ✅ Use query params instead of body for GET request
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
