import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";
import * as productController from "../controllers/productController.js";

const router = Router();

router.post("/", authenticate, requireAdmin, productController.createProduct);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProduct);
router.put("/:id", authenticate, requireAdmin, productController.updateProduct);
router.delete("/:id", authenticate, requireAdmin, productController.deleteProduct);

export default router;