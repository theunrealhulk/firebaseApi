import express from "express";
import authRoutes from "./routes/authentication.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";
import "dotenv/config";

const app = express();

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    logger.info({
        method: req.method,
        path: req.path,
        query: req.query,
    });
    next();
});

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/admin", adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

export { app };

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}