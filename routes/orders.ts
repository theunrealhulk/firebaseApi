import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { orderSchema, paginationSchema } from "../utils/validation.js";
import * as orderController from "../controllers/orderController.js";

const router = Router();

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, total]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer }
 *                     price: { type: number }
 *               total: { type: number }
 *     responses:
 *       201:
 *         description: Order created
 */
router.post("/", authenticate, validate(orderSchema), orderController.createOrder);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of user orders
 */
router.get("/", authenticate, validate(paginationSchema, "query"), orderController.getUserOrders);

/**
 * @swagger
 * /orders/all:
 *   get:
 *     summary: Get all orders (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of all orders
 */
router.get("/all", authenticate, requireAdmin, validate(paginationSchema, "query"), orderController.getOrders);

/**
 * @swagger
 * /orders/{id}/items:
 *   get:
 *     summary: Get order items
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order items
 */
router.get("/:id/items", authenticate, orderController.getOrderDetails);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, completed, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.patch("/:id/status", authenticate, requireAdmin, orderController.updateOrderStatus);

export default router;