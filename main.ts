import express from "express";
import authRoutes from "./routes/authentication.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import "dotenv/config";

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/admin", adminRoutes);

const PORT = process.env.PORT || 3000;

export { app };

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}