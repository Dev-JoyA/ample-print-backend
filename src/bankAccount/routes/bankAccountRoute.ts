import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { checkSuperAdmin } from "../../middleware/authorization.js";
import * as controller from "../controller/bankAccountController.js";

const router = Router();

router.get("/active", controller.getActive);

router.get("/", authMiddleware, checkSuperAdmin, controller.list);
router.post("/", authMiddleware, checkSuperAdmin, controller.create);
router.patch(
  "/:id/active",
  authMiddleware,
  checkSuperAdmin,
  controller.setActive,
);
router.delete("/:id", authMiddleware, checkSuperAdmin, controller.remove);

export default router;
