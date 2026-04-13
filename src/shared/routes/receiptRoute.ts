// import express, {Request , Response} from "express";
// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const router = express.Router();

// // Serve receipt files from uploads/receipts folder
// router.get("/:filename", (req: Request, res: Response) => {
//   const { filename } = req.params;
  
//   // Security: prevent directory traversal attacks
//   const safeFilename = path.basename(filename as string);
  
//   // Path to receipts folder
//   const receiptsPath = path.join(process.cwd(), "uploads", "receipts");
//   const filePath = path.join(receiptsPath, safeFilename);

//   console.log('🔍 Looking for receipt:', filePath);

//   // Check if file exists
//   if (!fs.existsSync(filePath)) {
//     return res.status(404).json({ 
//       success: false, 
//       message: "Receipt file not found" 
//     });
//   }

//   // Determine content type based on file extension
//   const ext = path.extname(filePath).toLowerCase();
//   const contentTypes = {
//     '.jpg': 'image/jpeg',
//     '.jpeg': 'image/jpeg',
//     '.png': 'image/png',
//     '.gif': 'image/gif',
//     '.pdf': 'application/pdf'
//   };

//   const contentType = contentTypes[ext as keyof typeof contentTypes] || 'application/octet-stream';

//   // Set content type and send file
//   res.setHeader('Content-Type', contentType);
//   res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  
//   // Send the file
//   res.sendFile(filePath, (err: any) => {
//     if (err) {
//       console.error('❌ Error sending receipt:', err);
//       res.status(500).json({ 
//         success: false, 
//         message: "Failed to serve receipt file" 
//       });
//     }
//   });
// });

// export default router;

import express, {Request , Response} from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper function to find file with case-insensitive matching
const findFileCaseInsensitive = (filePath: string): string | null => {
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  
  const dir = path.dirname(filePath);
  const requestedFilename = path.basename(filePath);
  
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    const matchingFile = files.find(file => 
      file.toLowerCase() === requestedFilename.toLowerCase()
    );
    
    if (matchingFile) {
      return path.join(dir, matchingFile);
    }
  }
  
  return null;
};

// Serve receipt files from uploads/receipts folder
router.get("/:filename", (req: Request, res: Response) => {
  const { filename } = req.params;
  
  // Security: prevent directory traversal attacks
  const safeFilename = path.basename(filename as string);
  
  // Path to receipts folder
  const receiptsPath = path.join(process.cwd(), "uploads", "receipts");
  const filePath = path.join(receiptsPath, safeFilename);

  console.log('🔍 Looking for receipt:', filePath);

  // Find file with case-insensitive matching
  const existingFilePath = findFileCaseInsensitive(filePath);
  
  if (!existingFilePath) {
    return res.status(404).json({ 
      success: false, 
      message: "Receipt file not found" 
    });
  }

  // Determine content type based on file extension
  const ext = path.extname(existingFilePath).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf'
  };

  const contentType = contentTypes[ext as keyof typeof contentTypes] || 'application/octet-stream';

  // Set content type and send file
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  
  // Send the file
  res.sendFile(existingFilePath, (err: any) => {
    if (err) {
      console.error('❌ Error sending receipt:', err);
      res.status(500).json({ 
        success: false, 
        message: "Failed to serve receipt file" 
      });
    }
  });
});

export default router;