import express from 'express';
import multer from 'multer';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        const ext = file.originalname.split(".").pop();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        cb(null, `${Date.now()}-${safeName}` + "." + ext); 
    }
    });

    const upload = multer({
        storage,
        limits: {
          fileSize: 10 * 1024 * 1024, 
        },
        fileFilter: (req, file, cb) => {
          const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ];
          if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error("Invalid file type. Allowed types: images, audio, PDF, Word, Excel, text."));
          }
        },
      });

    export default upload;

      
