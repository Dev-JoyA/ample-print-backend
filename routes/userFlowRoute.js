//end-point for user route , including file upload , payment, notification and cart

import express from "express";
import {jobDetails, uploadDetails} from "../controllers/userFlowController.js"

const router = express.Router()

router.post("/upload-design", uploadDetails)

router.post("/upload", upload.single("product_image"), async (req, res) => {
    try {
        const { product_name, product_price } = req.body;

        // Save the file path in the database
        const product = await Product.create({
            product_name,
            product_price,
            product_image: req.file.path, // Save the file path
        });

        res.status(201).json({ message: "Product created successfully", product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


export default router 