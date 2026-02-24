import { Request, Response } from "express";
import { Types } from "mongoose";
import upload from "../../config/upload.js";
import * as customerBriefService from "../service/customerBriefService.js";
import { CreateCustomerBriefDTO } from "../model/customerBrief.js";
import { UserRole } from "../../users/model/userModel.js";


export const uploadBriefFiles = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'voiceNote', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]);


// POST /api/customer/orders/:orderId/products/:productId/brief
export const submitCustomerBrief = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const { orderId, productId } = req.params;
    const { description } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!orderId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Product ID are required in URL"
      });
    }

    const hasText = description && description.trim().length > 0;
    const hasFiles = files && Object.keys(files).length > 0;

    if (!hasText && !hasFiles) {
      return res.status(400).json({
        success: false,
        message: "At least one customization detail (text or file) is required"
      });
    }

    const briefData: CreateCustomerBriefDTO = {
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(productId),
      description: description || undefined
    };

    if (files?.image) briefData.image = `/uploads/${files.image[0].filename}`;
    if (files?.voiceNote) briefData.voiceNote = `/uploads/${files.voiceNote[0].filename}`;
    if (files?.video) briefData.video = `/uploads/${files.video[0].filename}`;
    if (files?.logo) briefData.logo = `/uploads/${files.logo[0].filename}`;

    const brief = await customerBriefService.createOrUpdateCustomerBrief(
      briefData,
      user._id,
      user.role
    );

    res.status(201).json({
      success: true,
      message: "Brief submitted successfully",
      data: brief
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/admin/orders/:orderId/products/:productId/respond
export const adminRespondToBrief = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const { orderId, productId } = req.params;
    const { description, designId } = req.body; 
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!orderId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Product ID are required in URL"
      });
    }

    const briefData: CreateCustomerBriefDTO = {
      orderId: new Types.ObjectId(orderId),
      productId: new Types.ObjectId(productId),
      description: description || undefined,
      designId: designId ? new Types.ObjectId(designId) : undefined
    };

    // Add file paths
    if (files?.image) briefData.image = `/uploads/${files.image[0].filename}`;
    if (files?.voiceNote) briefData.voiceNote = `/uploads/${files.voiceNote[0].filename}`;
    if (files?.video) briefData.video = `/uploads/${files.video[0].filename}`;
    if (files?.logo) briefData.logo = `/uploads/${files.logo[0].filename}`;

    const brief = await customerBriefService.createOrUpdateCustomerBrief(
      briefData,
      user._id,
      user.role
    );

    res.status(201).json({
      success: true,
      message: "Admin response submitted successfully",
      data: brief
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/briefs/orders/:orderId/products/:productId
export const getBriefByOrderAndProduct = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const { orderId, productId } = req.params;

    if (!orderId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Product ID are required"
      });
    }

    const briefs = await customerBriefService.getCustomerBriefByOrderId(
      orderId,
      user._id,
      user.role
    );

    res.status(200).json({
      success: true,
      data: briefs
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/briefs/:briefId
export const getCustomerBriefById = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const { briefId } = req.params;

    if (!briefId) {
      return res.status(400).json({
        success: false,
        message: "Brief ID is required"
      });
    }

    const brief = await customerBriefService.getCustomerBriefById(
      briefId,
      user._id,
      user.role
    );

    if (!brief) {
      return res.status(404).json({
        success: false,
        message: "Brief not found"
      });
    }

    res.status(200).json({
      success: true,
      data: brief
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE /api/briefs/:briefId
export const deleteCustomerBrief = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };
    const { briefId } = req.params;

    if (!briefId) {
      return res.status(400).json({
        success: false,
        message: "Brief ID is required"
      });
    }

    const result = await customerBriefService.deleteCustomerBrief(
      briefId,
      user._id,
      user.role
    );

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
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
      limit
    );

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


// GET /api/admin/briefs
export const getAdminCustomerBriefs = async (req: Request, res: Response) => {
  try {
    const user = req.user as { _id: string; role: UserRole };

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const hasResponded = req.query.hasResponded === 'true' ? true : 
                        req.query.hasResponded === 'false' ? false : undefined;

    const result = await customerBriefService.getAdminCustomerBriefs(
      user._id,
      { status: status as any, hasResponded, page, limit }
    );

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/briefs/status/:orderId/:productId
export const checkAdminResponseStatus = async (req: Request, res: Response) => {
  try {
    const { orderId, productId } = req.params;

    const result = await customerBriefService.checkAdminResponseStatus(
      orderId,
      productId
    );

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};