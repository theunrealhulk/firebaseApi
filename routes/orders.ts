import { Router } from "express";
import { authenticate } from "../middleware/authMiddlware.js";
import * as orderController from "../controllers/orderController.js";

const router = Router();

router.post("/", authenticate, orderController.createOrder);
router.get("/", authenticate, orderController.getUserOrders);
router.get("/all", authenticate, orderController.getOrders);
router.get("/:id/items", authenticate, orderController.getOrderDetails);
router.patch("/:id/status", authenticate, orderController.updateOrderStatus);

export default router;