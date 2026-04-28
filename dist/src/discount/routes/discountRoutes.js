import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { checkSuperAdmin } from "../../middleware/authorization.js";
import { createDiscount, getAllDiscounts, getDiscountById, updateDiscount, deleteDiscount, toggleDiscountStatus, validateDiscount, getActiveDiscounts, } from "../controller/discountController.js";
const router = Router();
router.post("/validate", validateDiscount);
router.use(authMiddleware);
router.get("/active", getActiveDiscounts);
router.use(checkSuperAdmin);
router.post("/", createDiscount);
router.get("/", getAllDiscounts);
router.get("/:id", getDiscountById);
router.put("/:id", updateDiscount);
router.patch("/:id/toggle", toggleDiscountStatus);
router.delete("/:id", deleteDiscount);
export default router;
//# sourceMappingURL=discountRoutes.js.map