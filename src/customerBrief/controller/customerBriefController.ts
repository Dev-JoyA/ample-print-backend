import { Request, Response } from "express";
import { Types } from "mongoose";
import upload from "../../config/upload.js";
import * as customerBriefService from "../service/customerBriefService.js";
import { CreateCustomerBriefDTO } from "../model/customerBrief.js";
import { UserRole } from "../../users/model/userModel.js";

const getIO = (req: Request) => {
  return (req as any).io || req.app.get("io");
};

const getStringParam = (
  param: string | string[] | undefined,
): string | undefined => {
  return Array.isArray(param) ? param[0] : param;
};

export const uploadBriefFiles = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "voiceNote", maxCount: 1 },
  { name: "video", maxCount: 1 },
  { name: "logo", maxCount: 1 },
]);

// POST /api/customer/orders/:orderId/products/:productId/brief
export const submitCustomerBrief = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const orderId = getStringParam(req.params.orderId);
    const productId = getStringParam(req.params.productId);
    const { description } = req.body;
    const io = getIO(req);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!orderId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Product ID are required in URL",
      });
    }

    const hasText = description && description.trim().length > 0;
    const hasFiles = files && Object.keys(files).length > 0;

    if (!hasText && !hasFiles) {
      return res.status(400).json({
        success: false,
        message: "At least one customization detail (text or file) is required",
      });
    }

     let finalDescription = description;
    if (!finalDescription || finalDescription.trim() === '') {
      finalDescription = "Custom order - please check product specifications";
    }

    const briefData: CreateCustomerBriefDTO = {
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(productId),
      description: finalDescription || undefined,
    };

    if (files?.image) briefData.image = `/uploads/${files.image[0].filename}`;
    if (files?.voiceNote)
      briefData.voiceNote = `/uploads/${files.voiceNote[0].filename}`;
    if (files?.video) briefData.video = `/uploads/${files.video[0].filename}`;
    if (files?.logo) briefData.logo = `/uploads/${files.logo[0].filename}`;

    const brief = await customerBriefService.createOrUpdateCustomerBrief(
      briefData,
      user._id,
      user.role,
      io,
    );

    res.status(201).json({
      success: true,
      message: "Brief submitted successfully",
      data: brief,
    });
  } catch (error: any) {
    console.error("Error submitting customer brief:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/admin/orders/:orderId/products/:productId/respond
export const adminRespondToBrief = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const orderId = getStringParam(req.params.orderId);
    const productId = getStringParam(req.params.productId);
    const { description } = req.body;
    const designId = getStringParam(req.body.designId);
    const io = getIO(req);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!orderId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Product ID are required in URL",
      });
    }

    const briefData: CreateCustomerBriefDTO = {
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(productId),
      description: description || undefined,
      designId: designId ? new Types.ObjectId(designId) : undefined,
    };

    // Add file paths
    if (files?.image) briefData.image = `/uploads/${files.image[0].filename}`;
    if (files?.voiceNote)
      briefData.voiceNote = `/uploads/${files.voiceNote[0].filename}`;
    if (files?.video) briefData.video = `/uploads/${files.video[0].filename}`;
    if (files?.logo) briefData.logo = `/uploads/${files.logo[0].filename}`;

    const brief = await customerBriefService.createOrUpdateCustomerBrief(
      briefData,
      user._id,
      user.role,
      io,
    );

    res.status(201).json({
      success: true,
      message: "Admin response submitted successfully",
      data: brief,
    });
  } catch (error: any) {
    console.error("Error submitting admin response:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/briefs/orders/:orderId/products/:productId
export const getBriefByOrderAndProduct = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const orderId = getStringParam(req.params.orderId);
    const productId = getStringParam(req.params.productId);

    if (!orderId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Product ID are required",
      });
    }

    const briefs = await customerBriefService.getCustomerBriefByOrderId(
      orderId,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: briefs,
    });
  } catch (error: any) {
    console.error("Error fetching brief by order and product:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/briefs/:briefId
export const getCustomerBriefById = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const briefId = getStringParam(req.params.briefId);

    if (!briefId) {
      return res.status(400).json({
        success: false,
        message: "Brief ID is required",
      });
    }

    const brief = await customerBriefService.getCustomerBriefById(
      briefId,
      user._id,
      user.role,
    );

    if (!brief) {
      return res.status(404).json({
        success: false,
        message: "Brief not found",
      });
    }

    res.status(200).json({
      success: true,
      data: brief,
    });
  } catch (error: any) {
    console.error("Error fetching brief by ID:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE /api/briefs/:briefId
export const deleteCustomerBrief = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const briefId = getStringParam(req.params.briefId);
    const io = getIO(req);

    if (!briefId) {
      return res.status(400).json({
        success: false,
        message: "Brief ID is required",
      });
    }

    const result = await customerBriefService.deleteCustomerBrief(
      briefId,
      user._id,
      user.role,
      io,
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Error deleting brief:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/customer/briefs
export const getUserCustomerBriefs = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await customerBriefService.getUserCustomerBriefs(
      user._id,
      page,
      limit,
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error fetching user briefs:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/admin/briefs
export const getAdminCustomerBriefs = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const hasFiles = req.query.hasFiles === "true";
    const search = req.query.search as string;

    console.log("Admin briefs request:", { page, limit, status, hasFiles, search });

    const result = await customerBriefService.getAdminCustomerBriefs(user._id, {
      status: status as any,
      hasFiles,
      search,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error fetching admin briefs:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/briefs/status/:orderId/:productId
export const checkAdminResponseStatus = async (req: Request, res: Response) => {
  try {
    const orderId = getStringParam(req.params.orderId);
    const productId = getStringParam(req.params.productId);

    if (!orderId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Product ID are required",
      });
    }

    const result = await customerBriefService.checkAdminResponseStatus(
      orderId,
      productId,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error checking admin response status:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// PATCH /api/briefs/:briefId/view
export const markBriefAsViewed = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: string };
    const briefId = getStringParam(req.params.briefId);
    const io = getIO(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!briefId) {
      return res.status(400).json({
        success: false,
        message: "Brief ID is required",
      });
    }

    const brief = await customerBriefService.markBriefAsViewed(
      briefId,
      user._id,
      user.role,
      io,
    );

    res.status(200).json({
      success: true,
      message: "Brief marked as viewed",
      data: brief,
    });
  } catch (error: any) {
    console.error("Error marking brief as viewed:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/briefs/order/:orderId/status
export const getOrderBriefStatus = async (req: Request, res: Response) => {
  try {
    const orderId = getStringParam(req.params.orderId);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const status = await customerBriefService.getOrderBriefStatus(orderId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error("Error getting order brief status:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Add this to your customerBriefController.js

// GET /api/briefs/order/:orderId/all
export const getAllBriefsByOrderId = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const orderId = getStringParam(req.params.orderId);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const briefs = await customerBriefService.getAllBriefsByOrderId(
      orderId!,
      user._id,
      user.role,
    );

    res.status(200).json({
      success: true,
      data: briefs,
    });
  } catch (error: any) {
    console.error("Error fetching all briefs by order:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};