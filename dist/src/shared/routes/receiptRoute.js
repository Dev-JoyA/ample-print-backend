import express from "express";
import path from "path";
import fs from "fs";
const router = express.Router();
const findFileCaseInsensitive = (filePath) => {
    if (fs.existsSync(filePath)) {
        return filePath;
    }
    const dir = path.dirname(filePath);
    const requestedFilename = path.basename(filePath);
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const matchingFile = files.find((file) => file.toLowerCase() === requestedFilename.toLowerCase());
        if (matchingFile) {
            return path.join(dir, matchingFile);
        }
    }
    return null;
};
router.get("/:filename", (req, res) => {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const receiptsPath = path.join(process.cwd(), "uploads", "receipts");
    const filePath = path.join(receiptsPath, safeFilename);
    console.log("🔍 Looking for receipt:", filePath);
    const existingFilePath = findFileCaseInsensitive(filePath);
    if (!existingFilePath) {
        return res.status(404).json({
            success: false,
            message: "Receipt file not found",
        });
    }
    const ext = path.extname(existingFilePath).toLowerCase();
    const contentTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".pdf": "application/pdf",
    };
    const contentType = contentTypes[ext] ||
        "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);
    res.sendFile(existingFilePath, (err) => {
        if (err) {
            console.error("❌ Error sending receipt:", err);
            res.status(500).json({
                success: false,
                message: "Failed to serve receipt file",
            });
        }
    });
});
export default router;
//# sourceMappingURL=receiptRoute.js.map