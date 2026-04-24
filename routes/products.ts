import { Router } from "express";
import { authenticate } from "../middleware/authMiddlware.js";
import * as productController from "../controllers/productController.js";

const router = Router();

router.post("/", authenticate, productController.createProduct);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProduct);
router.put("/:id", authenticate, productController.updateProduct);
router.delete("/:id", authenticate, productController.deleteProduct);

export default router;