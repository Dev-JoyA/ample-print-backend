import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { checkSuperAdmin } from '../../middleware/authorization.js';
import { createDiscount, getAllDiscounts, getDiscountById, updateDiscount, deleteDiscount, toggleDiscountStatus, validateDiscount, getActiveDiscounts, } from '../controller/discountController.js';
const router = Router();
// Public validation endpoint (no auth required for checkout)
router.post('/validate', validateDiscount);
// Protected routes (require authentication)
router.use(authMiddleware);
// Get all active discounts (for checkout page)
router.get('/active', getActiveDiscounts);
// Super admin only routes
router.use(checkSuperAdmin);
router.post('/', createDiscount);
router.get('/', getAllDiscounts);
router.get('/:id', getDiscountById);
router.put('/:id', updateDiscount);
router.patch('/:id/toggle', toggleDiscountStatus);
router.delete('/:id', deleteDiscount);
export default router;
//# sourceMappingURL=discountRoutes.js.map