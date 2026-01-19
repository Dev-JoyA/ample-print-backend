import { Router } from "express";
import {
  createOrder,
  searchByOrderNumber,
  updateOrder,
  deleteOrder,
  getOrderById,
} from "../controller/orderController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  checkAdmin,
  checkOwnership,
  checkRole,
  checkSuperAdmin,
} from "../../middleware/authorization.js";

const router = Router();

router.post("/create/:id", createOrder);

router.put("/update/:id", authMiddleware, updateOrder);

router.get("/search/:orderNumber", searchByOrderNumber);

export default router;
