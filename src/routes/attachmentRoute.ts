import express from "express";
import path from "path";
import fs from "fs";

const router = express.Router();

// ------------------ DOWNLOAD FILE ------------------
router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;

  // The folder where Multer stores uploaded files
  const uploadsFolder = path.join(process.cwd(), "uploads");
  const filePath = path.join(uploadsFolder, filename);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  // Send the file for download
  res.download(filePath, filename, (err) => {
    if (err) {
      res
        .status(500)
        .json({ success: false, message: "Failed to download file" });
    }
  });
});

export default router;
