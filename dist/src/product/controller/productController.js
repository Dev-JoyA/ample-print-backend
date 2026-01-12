import * as productService from "../service/productService.js";
export const createCollection = async (req, res) => {
    try {
        const { name } = req.body;
        const collection = await productService.createCollection(name);
        res.status(201).json({ success: true, collection });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const updateCollection = async (req, res) => {
    try {
        const { name } = req.body;
        const { id } = req.params;
        const collection = await productService.updateCollection(id, name);
        res.status(200).json({ success: true, collection });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const deleteCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await productService.deleteCollection(id);
        res.status(200).json({ success: true, message });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const getCollectionsPaginated = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await productService.getCollectionsPaginated(page, limit);
        res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
// ---------------- CREATE PRODUCT ----------------
export const createProduct = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const files = req.files;
        if (!files || files.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "At least one image is required." });
        }
        const parsedProductData = JSON.parse(req.body.productData);
        const productData = {
            ...parsedProductData,
            image: `/uploads/${files[0].filename}`,
            filename: files[0].filename,
            images: files.map((f) => `/uploads/${f.filename}`),
            filenames: files.map((f) => f.filename),
        };
        const product = await productService.createProduct(collectionId, productData);
        res.status(201).json({ success: true, product });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
// ---------------- UPDATE PRODUCT ----------------
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files;
        const updatedData = { ...req.body };
        if (files && files.length > 0) {
            updatedData.image = `/uploads/${files[0].filename}`;
            updatedData.filename = `${files[0].filename}`;
            updatedData.images = files.map((file) => `/uploads/${file.filename}`);
            updatedData.filenames = files.map((file) => file.filename);
        }
        const updatedProduct = await productService.updateProduct(id, updatedData);
        res.status(200).json({ success: true, product: updatedProduct });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await productService.deleteProduct(id);
        res.status(200).json({ success: true, message });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productService.getProductById(id);
        res.status(200).json({ success: true, product });
    }
    catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};
export const getProductsPaginated = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await productService.getProductsPaginated(page, limit);
        res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const filterProducts = async (req, res) => {
    try {
        const { priceMin, priceMax, status, deliveryDay, collectionId } = req.query;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await productService.filterProducts({
            priceMin: priceMin ? Number(priceMin) : undefined,
            priceMax: priceMax ? Number(priceMax) : undefined,
            status: status,
            collectionId: collectionId,
        }, page, limit);
        res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const getProductsByCollectionId = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const products = await productService.getProductsByCollectionId(collectionId);
        res.status(200).json({ success: true, products });
    }
    catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};
export const searchProductsByName = async (req, res) => {
    try {
        const { search } = req.query;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await productService.searchProductsByName(search, page, limit);
        res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=productController.js.map