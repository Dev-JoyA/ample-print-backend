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

router.post('/collection', passport.authenticate("jwt", { session: false }), createCollection);
router.put('/:collectionId', passport.authenticate("jwt", { session: false }), updateCollection);
router.delete('/:collectionId', passport.authenticate("jwt", { session: false }), deleteCollection);
router.get('/collection', passport.authenticate("jwt", { session: false }), getAllCollections);
router.get('/:collectionId', passport.authenticate("jwt", { session: false }), getCollectionById);
router.post('/product', passport.authenticate("jwt", { session: false }), createProduct);
router.put('/:productId', passport.authenticate("jwt", { session: false }), updateProduct);
router.delete('/:productId', passport.authenticate("jwt", { session: false }), deleteProduct);
router.get('/product', passport.authenticate("jwt", { session: false }), getAllProducts);
router.get('/:productId', passport.authenticate("jwt", { session: false }), getProductById);

export default router;