import * as designService from "../service/designService.js";
import { Request, Response } from "express";
import { IDesign } from "../models/designModel.js";

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

export const createDesignController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = req.user as { _id: string; fullname: string };
    const files = req.files as Express.Multer.File[];
    const io = getIO(req);

    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one image is required." });
    }
    const data: IDesign = {
      ...req.body,
      uploadedBy: admin._id,
      designUrl: `/uploads/${files[0].filename}`,
      filename: `${files[0].filename}`,
      otherImage: files.map((file) => `/uploads/${file.filename}`),
      filenames: files.map((file) => file.filename),
    };

    const design = await designService.uploadDesign(id, data, io);
    const populatedDesign = await design.populate(
      "uploadedBy",
      "fullname email",
    );
    res.status(201).json({ success: true, populatedDesign });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatedDesignController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = req.user as { _id: string; fullname: string };
    const files = req.files as Express.Multer.File[];
    const io = getIO(req);

    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one image is required." });
    }
    const updatedData: Partial<IDesign> = {
      ...req.body,
      uploadedBy: admin._id,
    };
    if (files && files.length > 0) {
      updatedData.designUrl = `/uploads/${files[0].filename}`;
      updatedData.filename = `${files[0].filename}`;
      updatedData.otherImage = files.map((file) => `/uploads/${file.filename}`);
      updatedData.filenames = files.map((file) => file.filename);
    }

    const update = await designService.updateDesign(id, updatedData, io);
    const populateDesign = await update.populate(
      "uploadedBy",
      "fullname email",
    );

    res.status(200).json({ success: true, populateDesign });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteDesignController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteDesign = await designService.deleteDesign(id);
    res.status(200).json({ success: true, deleteDesign });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const approveDesignController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const design = await designService.approveDesign(id);
    res.status(200).json({ success: true, design });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getDesignByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const design = await designService.getDesignById(id);
    res.status(200).json({ success: true, design });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getUserController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const design = await designService.getUserDesigns(id);
    res.status(200).json({ success: true, design });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getDesignByorderIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const design = await designService.getDesignsByOrderId(id);
    res.status(200).json({ success: true, design });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getDesignByProductIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const design = await designService.getDesignByProductId(id);
    res.status(200).json({ success: true, design });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllDesignsController = async (req: Request, res: Response) => {
  try {
    const design = await designService.getAllDesigns();
    res.status(200).json({ success: true, design });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const filterDesignController = async (req: Request, res: Response) => {
  try {
    const data: designService.IDesignFilter = req.body;
    const design = await designService.filterDesigns(data);
    res.status(200).json({ success: true, design });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
