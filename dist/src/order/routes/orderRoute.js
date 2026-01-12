import { Router } from "express";
import { createOrder, searchByOrderNumber, updateOrder } from "../controller/orderController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
const router = Router();
router.post("/create/:id", authMiddleware, createOrder);
router.put("/update/:id", authMiddleware, updateOrder);
router.get("/search/:orderNumber", searchByOrderNumber);
export default router;
//# sourceMappingURL=orderRoute.js.map