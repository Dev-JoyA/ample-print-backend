// import express from "express";
// import path from "path";
// import fs from "fs";

// const router = express.Router();

// const findFileCaseInsensitive = (filePath: string): string | null => {
//   if (fs.existsSync(filePath)) {
//     return filePath;
//   }

//   const dir = path.dirname(filePath);
//   const requestedFilename = path.basename(filePath);

//   console.log("🔍 Looking for file:", requestedFilename);
//   console.log("📁 In directory:", dir);

//   if (fs.existsSync(dir)) {
//     const files = fs.readdirSync(dir);
//     console.log("📄 Available files:", files);

//     const matchingFile = files.find(
//       (file) => file.toLowerCase() === requestedFilename.toLowerCase(),
//     );

//     if (matchingFile) {
//       console.log("✅ Found matching file:", matchingFile);
//       return path.join(dir, matchingFile);
//     }
//   }

//   console.log("❌ No matching file found");
//   return null;
// };

// router.get("/download/:filename", (req, res) => {
//   const { filename } = req.params;
//   const filePath = path.join(process.cwd(), "uploads", filename);

//   const existingFilePath = findFileCaseInsensitive(filePath);

//   if (!existingFilePath) {
//     return res.status(404).json({ success: false, message: "File not found" });
//   }

//   res.download(existingFilePath, filename, (err) => {
//     if (!err) return;

//     if (!res.headersSent) {
//       return res
//         .status(500)
//         .json({ success: false, message: "Failed to download file" });
//     }

//     res.destroy(err);
//   });
// });

// router.get("/images/:filename", (req, res) => {
//   const { filename } = req.params;
//   console.log("🎯 Requested image:", filename);

//   const filePath = path.join(process.cwd(), "uploads", filename);
//   const existingFilePath = findFileCaseInsensitive(filePath);

//   if (!existingFilePath) {
//     return res.status(404).json({ success: false, message: "File not found" });
//   }

//   const ext = path.extname(existingFilePath).toLowerCase();

//   const contentTypes: Record<string, string> = {
//     ".jpg": "image/jpeg",
//     ".jpeg": "image/jpeg",
//     ".png": "image/png",
//     ".gif": "image/gif",
//     ".webp": "image/webp",
//     ".svg": "image/svg+xml",
//     ".mp4": "video/mp4",
//     ".webm": "video/webm",
//     ".mp3": "audio/mpeg",
//     ".wav": "audio/wav",
//     ".ogg": "audio/ogg",
//   };

//   const contentType = contentTypes[ext] || "application/octet-stream";

//   res.setHeader("Content-Type", contentType);
//   res.setHeader("Cache-Control", "public, max-age=31536000");

//   const stream = fs.createReadStream(existingFilePath);
//   stream.pipe(res);

//   stream.on("error", (err) => {
//     console.error("Error streaming file:", err);
//     if (!res.headersSent) {
//       res.status(500).json({ success: false, message: "Error streaming file" });
//     }
//   });
// });

// export default router;

import express from "express";
import path from "path";
import fs from "fs";

const router = express.Router();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_FOLDER = "ample-print";

// Determines if a string looks like a bare Cloudinary public ID
// (no file extension, no slashes — e.g. "ksegbpmlpwbqocmf2avf")
const isCloudinaryPublicId = (filename: string): boolean => {
  return !path.extname(filename) && !filename.includes("/");
};

const buildCloudinaryUrl = (
  publicId: string,
  resourceType = "auto",
): string => {
  return `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload/${CLOUDINARY_FOLDER}/${publicId}`;
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

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
};

// GET /api/images/:filename
router.get("/images/:filename", (req, res) => {
  const { filename } = req.params;

  const hasNoExtension = !filename.includes(".");
  const isNotUrl = !filename.includes("http");

  if (CLOUD_NAME && hasNoExtension && isNotUrl) {
    // IMPORTANT: Add the folder path to the public_id
    const fullPublicId = `${CLOUDINARY_FOLDER}/${filename}`;
    const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${fullPublicId}`;
    console.log("☁️  Redirecting to Cloudinary:", url);
    return res.redirect(302, url);
  }

  console.log("🎯 Requested file:", filename);
  console.log("CLOUD_NAME exists?", !!CLOUD_NAME);
  console.log("isCloudinaryPublicId?", isCloudinaryPublicId(filename));

  // Case 1: bare Cloudinary public ID — redirect to Cloudinary directly
  if (CLOUD_NAME && isCloudinaryPublicId(filename)) {
    const url = buildCloudinaryUrl(filename);
    console.log("☁️  Redirecting to Cloudinary:", url);
    return res.redirect(302, url);
  }

  // Case 2: legacy local file
  const filePath = path.join(process.cwd(), "uploads", filename);
  const existingFilePath = findFileCaseInsensitive(filePath);

  if (!existingFilePath) {
    console.log("❌ File not found locally:", filename);
    return res.status(404).json({ success: false, message: "File not found" });
  }

  const ext = path.extname(existingFilePath).toLowerCase();
  const contentType = contentTypes[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000");

  const stream = fs.createReadStream(existingFilePath);
  stream.pipe(res);

  stream.on("error", (err) => {
    console.error("❌ Error streaming file:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Error streaming file" });
    }
  });
});

// GET /api/download/:filename
router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;
  console.log("⬇️  Download requested:", filename);

  // Case 1: bare Cloudinary public ID — redirect to Cloudinary
  if (CLOUD_NAME && isCloudinaryPublicId(filename)) {
    const url = buildCloudinaryUrl(filename);
    console.log("☁️  Redirecting download to Cloudinary:", url);
    return res.redirect(302, url);
  }

  // Case 2: legacy local file
  const filePath = path.join(process.cwd(), "uploads", filename);
  const existingFilePath = findFileCaseInsensitive(filePath);

  if (!existingFilePath) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  res.download(existingFilePath, filename, (err) => {
    if (!err) return;
    if (!res.headersSent) {
      res
        .status(500)
        .json({ success: false, message: "Failed to download file" });
    } else {
      res.destroy(err);
    }
  });
});

export default router;
