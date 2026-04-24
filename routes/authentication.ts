import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import * as authController from "../controllers/authController.js"

const router = Router();
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);

export default router;