import express from 'express';
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
    getProductById,
    getProductsByCollectionId,
    getProductByCollectionName,
    getProductByProductName,
} from '../controllers/contentController.js';

const router = express.Router();


// Static routes first
router.get('/collection', getAllCollections);
router.get('/products', getAllProducts); 
router.get('/product_name', getProductByProductName);
router.get('/', getProductByCollectionName); 

// Dynamic routes after static routes
router.post('/collection', createCollection);
router.put('/:collection_id', ...updateCollection);
router.delete('/:collection_id', deleteCollection);
router.get('/:collectionId', getCollectionById);
router.post('/product/:collection_id', createProduct);
router.put('/:product_id/:collection_id', ...updateProduct);
router.delete('/:product_id/:collection_id', deleteProduct);
router.get('/:product_id', getProductById);
router.get('/:collection_id', getProductsByCollectionId); 

export default router;