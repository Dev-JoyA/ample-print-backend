// import multer, { StorageEngine } from "multer";
// import { Request } from "express";

// const storage: StorageEngine = multer.diskStorage({
//   destination: function (
//     req: Request,
//     file: Express.Multer.File,
//     cb: (error: Error | null, destination: string) => void,
//   ) {
//     cb(null, "uploads/");
//   },
//   filename: function (
//     req: Request,
//     file: Express.Multer.File,
//     cb: (error: Error | null, filename: string) => void,
//   ) {
//     const original = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
//     cb(null, `${Date.now()}-${original}`);
//   },
// });

// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB
//   },
// });

// export default upload;

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req: any, file: any) => ({
    folder: "ample-print",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "wav",
      "webm",
      "mp3",
      "pdf",
    ],
    resource_type: "auto",
  }),
});

const receiptStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req: any, file: any) => ({
    folder: "ample-print/receipts",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "pdf"],
    resource_type: "image",
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;
