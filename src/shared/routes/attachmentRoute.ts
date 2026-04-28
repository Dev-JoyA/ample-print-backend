import express from "express";
import path from "path";
import fs from "fs";

const router = express.Router();

const findFileCaseInsensitive = (filePath: string): string | null => {
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  const dir = path.dirname(filePath);
  const requestedFilename = path.basename(filePath);

  console.log("🔍 Looking for file:", requestedFilename);
  console.log("📁 In directory:", dir);

  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    console.log("📄 Available files:", files);

    const matchingFile = files.find(
      (file) => file.toLowerCase() === requestedFilename.toLowerCase(),
    );

    if (matchingFile) {
      console.log("✅ Found matching file:", matchingFile);
      return path.join(dir, matchingFile);
    }
  }

  console.log("❌ No matching file found");
  return null;
};

router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), "uploads", filename);

  const existingFilePath = findFileCaseInsensitive(filePath);

  if (!existingFilePath) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  res.download(existingFilePath, filename, (err) => {
    if (!err) return;

    if (!res.headersSent) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to download file" });
    }

    res.destroy(err);
  });
});

router.get("/images/:filename", (req, res) => {
  const { filename } = req.params;
  console.log("🎯 Requested image:", filename);

  const filePath = path.join(process.cwd(), "uploads", filename);
  const existingFilePath = findFileCaseInsensitive(filePath);

  if (!existingFilePath) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  const ext = path.extname(existingFilePath).toLowerCase();

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
  };

  const contentType = contentTypes[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000");

  const stream = fs.createReadStream(existingFilePath);
  stream.pipe(res);

  stream.on("error", (err) => {
    console.error("Error streaming file:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Error streaming file" });
    }
  });
});

export default router;
