import express from 'express';
import passport from "../middleware/passport.js";
import {
    createCollection,
    updateCollection,
    deleteCollection,
    getAllCollections,
    getCollectionById,
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductById
} from '../controllers/contentController.js';

const router = express.Router();

router.get('/products',  getAllProducts);
router.post('/collection', createCollection);
router.put('/:collection_id', ...updateCollection);
router.delete('/:collection_id', deleteCollection);
router.get('/collection', getAllCollections);
router.get('/:collectionId', getCollectionById);
router.post('/product', createProduct);
router.put('/:productId/:collectionId', ...updateProduct);
router.delete('/:productId', deleteProduct);

router.get('/:productId',  getProductById);

export default router;