import express from "express";
import path from "path";
import fs from "fs";

const router = express.Router();

// ------------------ DOWNLOAD FILE ------------------
router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), "uploads", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  res.download(filePath, filename, (err) => {
    if (!err) return;

    if (!res.headersSent) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to download file" });
    }

    res.destroy(err);
  });
});

export default router;