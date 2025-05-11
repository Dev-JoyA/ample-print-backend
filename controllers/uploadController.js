import User_Design  from '../models/userDesignModel.js'; 
import  Design  from "../models/designModel.js";
import { checkRole, checkSuperAdmin } from "../middleware/authorization.js";
import { verifyToken } from '../utils/auth.js';
import upload from "../config/upload.js";
import fs from "fs/promises";

// Create a new design with file uploads
export const createDesign = [
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "voice_note", maxCount: 1 },
    { name: "other_image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { description } = req.body;
      const user = req.user; 

      if (!user || user.role !== "customer") {
        return res.status(403).json({ error: "Unauthorized: Only customers can create designs" });
      }

      if (
        !req.files?.logo &&
        !req.files?.voice_note &&
        !req.files?.other_image &&
        !description
      ) {
        return res.status(400).json({
          error: "At least one of logo, voice note, other image, or description is required",
        });
      }

      const design = await Design.create({
        logo_url: req.files?.logo ? req.files.logo[0].path : null,
        voice_note_url: req.files?.voice_note ? req.files.voice_note[0].path : null,
        other_image: req.files?.other_image ? req.files.other_image[0].path : null,
        description: description || null,
      });

      // Link design to user
      await User_Design.create({
        user_id: user.user_id,
        design_id: design.design_id,
      });

      res.status(201).json(design);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

// Update an existing design with file uploads
export const updateDesign = [
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "voice_note", maxCount: 1 },
    { name: "other_image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { designId } = req.params;
      const { description } = req.body;
      const user = req.user;

      if (!user || !["customer", "admin"].includes(user.role)) {
        return res.status(403).json({ error: "Unauthorized: Only customers or admins can update designs" });
      }

      const design = await Design.findByPk(designId);
      if (!design) {
        return res.status(404).json({ error: "Design not found" });
      }

      // Update fields if provided
      design.logo_url = req.files.logo ? req.files.logo[0].path : design.logo_url;
      design.voice_note_url = req.files.voice_note
        ? req.files.voice_note[0].path
        : design.voice_note_url;
      design.other_image = req.files.other_image
        ? req.files.other_image[0].path
        : design.other_image;
      design.description = description !== undefined ? description : design.description;

      await design.save();
      res.json(design);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

export const getDesigns = [
    checkRole(["customer", "admin"]),
    async (req, res) => {
      try {
        const user = req.user;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
  
        let designs;
        if (user.role === "customer") {
          designs = await Design.findAndCountAll({
            include: [
              {
                model: User_Design,
                where: { user_id: user.user_id },
                attributes: [],
              },
            ],
            limit,
            offset,
          });
        } else {
          designs = await Design.findAndCountAll({ limit, offset });
        }
  
        res.json({
          designs: designs.rows,
          total: designs.count,
          page,
          pages: Math.ceil(designs.count / limit),
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  ];

 //get design by id
 export const getOne = [
    checkRole(["customer", "admin"]),
    async (req, res) => {
      try {
        const { designId } = req.params;
        const user = req.user;
  
        const design = await Design.findByPk(designId);
        if (!design) {
          return res.status(404).json({ error: "Design not found" });
        }
  
        // For customers, check ownership
        if (user.role === "customer") {
          const userDesign = await User_Design.findOne({
            where: { user_id: user.user_id, design_id: designId },
          });
          if (!userDesign) {
            return res.status(403).json({ error: "Unauthorized: You do not own this design" });
          }
        }
  
        res.json(design);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },
  ];

  // Delete a design
  // Only admins can delete designs
export const deleteDesign = [
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { designId } = req.params;
      const design = await Design.findByPk(designId);
      if (!design) {
        return res.status(404).json({ error: "Design not found" });
      }

      // Delete files
      const files = [design.logo_url, design.voice_note_url, design.other_image].filter(Boolean);
      for (const file of files) {
        try {
          await fs.unlink(file);
        } catch (err) {
          console.error(`Failed to delete file ${file}:`, err);
        }
      }

      await design.destroy();
      res.json({ message: "Design deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];