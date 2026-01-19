import { Router } from "express";
import {
  getAllUsersController,
  getUserByIdController,
  updateProfileController,
  deleteUserController,
  changeUserRoleController,
  toggleUserActivenessController,
  getUserAddressController,
} from "../controller/userController.js";

import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  checkAdmin,
  checkSuperAdmin,
  checkOwnership,
} from "../../middleware/authorization.js";

const router = Router();

router.get("/", getAllUsersController);

router.get("/:userId", authMiddleware, checkAdmin, getUserByIdController);

router.get(
  "/:userId/address",
  authMiddleware,
  checkOwnership,
  getUserAddressController,
);

router.put(
  "/:userId/profile",
  authMiddleware,
  checkOwnership,
  updateProfileController,
);

router.delete(
  "/:userId",
  authMiddleware,
  checkSuperAdmin,
  deleteUserController,
);

router.patch(
  "/:userId/role",
  authMiddleware,
  checkSuperAdmin,
  changeUserRoleController,
);

router.patch(
  "/:userId/activeness",
  authMiddleware,
  checkSuperAdmin,
  toggleUserActivenessController,
);

export default router;
