import multer from "multer";
import path from "path";

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./files/"); // Directory where files will be saved
    },
    filename: (req, file, cb) => {
         const uniqueName = `${Date.now()}-${file.originalname}`
        cb(null, uniqueName); // Unique file name
    },
});


// Initialize Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, 
});

export default upload;