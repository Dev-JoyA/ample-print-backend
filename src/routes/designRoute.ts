import { Router } from 'express';
import {createDesignController,
updatedDesignController,
deleteDesignController,
approveDesignController,
getDesignByIdController,
getUserController,
getDesignByorderIdController,
getDesignByProductIdController,
getAllDesignsController,
filterDesignController
} from '../controller/designController.js';
import { authMiddleware } from "../middleware/authMiddleware.js";
import { checkSuperAdmin, checkAdmin, checkOwnership } from "../middleware/authorization.js";

const router = Router();

router.post(
  '/orders/:productId',
  authMiddleware,
  checkAdmin,
  createDesignController
);

router.put(
  '/update/:designId',
  authMiddleware,
  checkAdmin,
  updatedDesignController
);

router.delete(
  '/delete/:designId',
  authMiddleware,
  checkSuperAdmin,
  deleteDesignController
);

router.put(
  '/:designId/approve',
  authMiddleware,
  checkOwnership,
  approveDesignController
);

router.get(
  '/:designId',
  getDesignByIdController
);

router.get(
  '/users/:userId',
  authMiddleware,
  getUserController
);

router.get(
  '/orders/:orderId',
  getDesignByorderIdController
);

router.get(
  '/products/:productId',
  getDesignByProductIdController
);

router.get(
  '/all',
  getAllDesignsController
);

router.get(
  '/filter',
  authMiddleware,
  checkAdmin,
  filterDesignController
);

export default router;