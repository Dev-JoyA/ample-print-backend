// import express, { Request, Response } from "express";
// import path from "path";
// import fs from "fs";

// const router = express.Router();

// const findFileCaseInsensitive = (filePath: string): string | null => {
//   if (fs.existsSync(filePath)) {
//     return filePath;
//   }

//   const dir = path.dirname(filePath);
//   const requestedFilename = path.basename(filePath);

//   if (fs.existsSync(dir)) {
//     const files = fs.readdirSync(dir);
//     const matchingFile = files.find(
//       (file) => file.toLowerCase() === requestedFilename.toLowerCase(),
//     );

//     if (matchingFile) {
//       return path.join(dir, matchingFile);
//     }
//   }

//   return null;
// };

// router.get("/:filename", (req: Request, res: Response) => {
//   const { filename } = req.params;

//   const safeFilename = path.basename(filename as string);

//   const receiptsPath = path.join(process.cwd(), "uploads", "receipts");
//   const filePath = path.join(receiptsPath, safeFilename);

//   console.log("🔍 Looking for receipt:", filePath);

//   const existingFilePath = findFileCaseInsensitive(filePath);

//   if (!existingFilePath) {
//     return res.status(404).json({
//       success: false,
//       message: "Receipt file not found",
//     });
//   }

//   const ext = path.extname(existingFilePath).toLowerCase();
//   const contentTypes = {
//     ".jpg": "image/jpeg",
//     ".jpeg": "image/jpeg",
//     ".png": "image/png",
//     ".gif": "image/gif",
//     ".pdf": "application/pdf",
//   };

//   const contentType =
//     contentTypes[ext as keyof typeof contentTypes] ||
//     "application/octet-stream";

//   res.setHeader("Content-Type", contentType);
//   res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);

//   res.sendFile(existingFilePath, (err: any) => {
//     if (err) {
//       console.error("❌ Error sending receipt:", err);
//       res.status(500).json({
//         success: false,
//         message: "Failed to serve receipt file",
//       });
//     }
//   });
// });

// export default router;

import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";

const router = express.Router();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_FOLDER = "ample-print/receipts";

const isCloudinaryPublicId = (filename: string): boolean => {
  return !path.extname(filename) && !filename.includes("/");
};

const findFileCaseInsensitive = (filePath: string): string | null => {
  if (fs.existsSync(filePath)) return filePath;

  const dir = path.dirname(filePath);
  const requestedFilename = path.basename(filePath);

  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    const match = files.find(
      (file) => file.toLowerCase() === requestedFilename.toLowerCase(),
    );
    if (match) return path.join(dir, match);
  }

  return null;
};

// GET /api/receipts/:filename
router.get("/:filename", (req: Request, res: Response) => {
  const { filename } = req.params;
  const safeFilename = path.basename(
    Array.isArray(filename) ? filename[0] : filename,
  );
  console.log("🔍 Receipt requested:", safeFilename);

  // Case 1: bare Cloudinary public ID — redirect to Cloudinary
  if (CLOUD_NAME && isCloudinaryPublicId(safeFilename)) {
    const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${CLOUDINARY_FOLDER}/${safeFilename}`;
    console.log("☁️  Redirecting receipt to Cloudinary:", url);
    return res.redirect(302, url);
  }

  // Case 2: legacy local file
  const receiptsPath = path.join(process.cwd(), "uploads", "receipts");
  const filePath = path.join(receiptsPath, safeFilename);
  const existingFilePath = findFileCaseInsensitive(filePath);

  if (!existingFilePath) {
    return res
      .status(404)
      .json({ success: false, message: "Receipt file not found" });
  }

  const ext = path.extname(existingFilePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
  };

  const contentType = contentTypes[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);

  res.sendFile(existingFilePath, (err: any) => {
    if (err) {
      console.error("❌ Error sending receipt:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ success: false, message: "Failed to serve receipt file" });
      }
    }
  });
});

export default router;
