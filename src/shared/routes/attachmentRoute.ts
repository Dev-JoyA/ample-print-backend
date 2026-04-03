import express from "express";
import path from "path";
import fs from "fs";

const router = express.Router();

// ------------------ DOWNLOAD FILE ------------------
router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;

  const uploadsFolder = path.join(process.cwd(), "uploads");
  const filePath = path.join(uploadsFolder, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      // Only send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Failed to download file" });
      } else {
        // Headers already sent (download started then failed mid-stream)
        // Just log it — you can't send a JSON response at this point
        console.error("Download error after headers sent:", err);
      }
    }
  });
});

export default router;