import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import authRoutes from "./routes/authentication.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import healthRoutes from "./routes/health.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";
import "dotenv/config";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
    logger.info({ method: req.method, path: req.path, query: req.query });
    next();
});

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Firebase REST API",
            version: "1.0.0",
            description: "Express + Firebase Authentication & Firestore API",
        },
        servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./routes/*.ts"],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

export { app };

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`API Docs: http://localhost:${PORT}/api-docs`);
    });
}