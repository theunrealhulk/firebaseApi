import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";

const router = Router();

router.get("/users", authenticate, requireAdmin, adminController.getAllUsers);
router.post("/set-role", authenticate, requireAdmin, adminController.setUserRole);

export default router;