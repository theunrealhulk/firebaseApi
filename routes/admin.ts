import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { setRoleSchema, paginationSchema } from "../utils/validation.js";
import * as adminController from "../controllers/adminController.js";

const router = Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin]
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
 *         description: List of users
 */
router.get("/users", authenticate, requireAdmin, validate(paginationSchema, "query"), adminController.getAllUsers);

/**
 * @swagger
 * /admin/set-role:
 *   post:
 *     summary: Set user role (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [uid, role]
 *             properties:
 *               uid:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, client, moderator]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.post("/set-role", authenticate, requireAdmin, validate(setRoleSchema), adminController.setUserRole);

export default router;