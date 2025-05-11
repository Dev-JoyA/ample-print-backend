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
        }
      });

    export default upload;

      
