import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";
import * as orderController from "../controllers/orderController.js";

const router = Router();

router.post("/", authenticate, orderController.createOrder);
router.get("/", authenticate, orderController.getUserOrders);
router.get("/all", authenticate, requireAdmin, orderController.getOrders);
router.get("/:id/items", authenticate, orderController.getOrderDetails);
router.patch("/:id/status", authenticate, requireAdmin, orderController.updateOrderStatus);

export default router;