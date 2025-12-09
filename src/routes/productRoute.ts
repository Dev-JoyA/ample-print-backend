import express from "express";
import * as productController from "../controller/productController.js";
import upload from "../config/upload.js"; 
import { authMiddleware } from "../middleware/authMiddleware.js";
import { checkSuperAdmin, checkAdmin, checkOwnership } from "../middleware/authorization.js";

const router = express.Router();



router.post("/collections",
    authMiddleware,
    checkAdmin,
    productController.createCollection);

router.put("/collections/:id",
    authMiddleware,
    checkAdmin,
    productController.updateCollection);

router.delete("/collections/:id", 
    authMiddleware,
    checkAdmin,
    productController.deleteCollection);

router.get("/collections", productController.getCollectionsPaginated);

router.get("/products/filter", productController.filterProducts);
// -------------------- PRODUCT ROUTES --------------------

router.post(
  "/collections/:collectionId/products",
    authMiddleware,
    checkAdmin,
    upload.array("images", 10), // up to 10 images
    productController.createProduct
);

router.put(
  "/products/:id",
     authMiddleware,
    checkAdmin,
    upload.array("images", 10),
    productController.updateProduct
);

router.delete("/products/:id", 
    authMiddleware,
    checkAdmin,
    productController.deleteProduct);

router.get("/products/:id", productController.getProductById);

router.get("/products", productController.getProductsPaginated);

router.get("/collections/:collectionId/all-products", productController.getProductsByCollectionId);

router.get("/products/search/by-name", productController.searchProductsByName);

export default router;
