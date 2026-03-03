import express from "express";
import * as productController from "../controller/productController.js";
import upload from "../../config/upload.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  checkSuperAdmin,
  checkAdmin,
} from "../../middleware/authorization.js";

const router = express.Router();

/* ===================== COLLECTION ROUTES ===================== */

// Create collection
router.post(
  "/collections",
  authMiddleware,
  checkAdmin,
  productController.createCollection
);

// Update collection
router.put(
  "/collections/:id",
  authMiddleware,
  checkAdmin,
  productController.updateCollection
);

// Delete collection
router.delete(
  "/collections/:id",
  authMiddleware,
  checkAdmin,
  productController.deleteCollection
);

// Get collections (paginated)
router.get("/collections", productController.getCollectionsPaginated);

/* ===================== PRODUCT FILTER & SEARCH ===================== */

// Filter products
router.get("/products/filter", productController.filterProducts);

// Search products by name
router.get("/products/search/by-name", productController.searchProductsByName);

/* ===================== PRODUCT CREATE ===================== */

// Create product under a collection
router.post(
  "/collections/:collectionId/products",
  authMiddleware,
  checkAdmin,
  upload.array("images", 3),
  productController.createProduct,
);

/* ===================== PRODUCT UPDATE / DELETE ===================== */

// Update product
router.put(
  "/products/:id",
  authMiddleware,
  checkAdmin,
  upload.array("images", 10),
  productController.updateProduct
);

// Delete product
router.delete(
  "/products/:id",
  authMiddleware,
  checkAdmin,
  productController.deleteProduct
);

/* ===================== PRODUCT LISTING ===================== */

// Get all products (paginated)
router.get("/products", productController.getProductsPaginated);

// Get products by collection
router.get(
  "/collections/:collectionId/all-products",
  productController.getProductsByCollectionId
);

// Get collection by ID
router.get("/collections/:id", productController.getCollectionById);

// Optional: make products route match frontend expectations
router.get("/collections/:id/products", productController.getProductsByCollectionId);

/* ===================== PRODUCT BY ID (KEEP LAST) ===================== */

router.get("/products/:id", productController.getProductById);

export default router;