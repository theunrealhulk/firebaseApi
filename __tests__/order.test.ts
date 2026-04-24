import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import type { Request, Response } from "express";

jest.mock("../utils/firebase.js");
import { db, auth } from "../utils/firebase.js";

const mockUser = { uid: "user-123", email: "user@test.com", displayName: "Test User" };
const mockAdmin = { uid: "admin-123", email: "admin@test.com", displayName: "Admin User", role: "admin" };
const mockClient = { uid: "client-123", email: "client@test.com", displayName: "Client User", role: "client" };

const mockOrderData = {
    id: "order-123",
    userId: "user-123",
    total: 200,
    status: "pending",
    createdAt: new Date(),
};

const mockOrderItems = [
    { id: "item-1", orderId: "order-123", productId: "prod-1", quantity: 2, price: 100 },
];

let mockOrders = [{ ...mockOrderData }];
let mockItems = [...mockOrderItems];

const resetMocks = () => {
    jest.clearAllMocks();
    mockOrders = [{ ...mockOrderData }];
    mockItems = [...mockOrderItems];
};

// Middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split("Bearer ")[1];
    if (token === "admin-token") {
        req.user = mockAdmin;
    } else if (token === "client-token") {
        req.user = mockClient;
    } else if (token === "other-client-token") {
        req.user = { uid: "other-user", email: "other@test.com", role: "client" };
    } else {
        return res.status(401).json({ error: "Invalid token" });
    }
    next();
};

const requireAdmin = (req: Request, res: Response, next: Function) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};

// Controllers
const createOrder = async (req: Request, res: Response) => {
    if (!req.user?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { items, total } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items required" });
    }
    if (!total) {
        return res.status(400).json({ error: "Total required" });
    }
    try {
        const orderRef = db.collection("orders").doc();
        await orderRef.set({ userId: req.user.uid, total, status: "pending", createdAt: new Date() });
        return res.status(201).json({ orderId: orderRef.id, message: "Order created" });
    } catch {
        return res.status(500).json({ error: "Failed to create order" });
    }
};

const getUserOrders = async (req: Request, res: Response) => {
    if (!req.user?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.uid;
    try {
        const userOrders = mockOrders.filter(o => o.userId === userId);
        return res.json({ data: userOrders, pagination: { page: 1, limit: 20, total: userOrders.length, totalPages: 1, hasNext: false, hasPrev: false } });
    } catch {
        return res.status(500).json({ error: "Failed to get orders" });
    }
};

const getAllOrders = async (req: Request, res: Response) => {
    try {
        return res.json({ data: mockOrders, pagination: { page: 1, limit: 20, total: mockOrders.length, totalPages: 1, hasNext: false, hasPrev: false } });
    } catch {
        return res.status(500).json({ error: "Failed to get orders" });
    }
};

const getOrderDetails = async (req: Request, res: Response) => {
    const orderId = req.params.id;
    try {
        const items = mockItems.filter(i => i.orderId === orderId);
        return res.json({ data: items, pagination: { page: 1, limit: 20, total: items.length, totalPages: 1, hasNext: false, hasPrev: false } });
    } catch {
        return res.status(500).json({ error: "Failed to get order items" });
    }
};

const updateOrderStatus = async (req: Request, res: Response) => {
    const { status } = req.body;
    const validStatuses = ["pending", "processing", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }
    try {
        return res.json({ message: "Order status updated" });
    } catch {
        return res.status(500).json({ error: "Failed to update order" });
    }
};

const app = express();
app.use(express.json());
app.post("/orders", authenticate, createOrder);
app.get("/orders", authenticate, getUserOrders);
app.get("/orders/all", authenticate, requireAdmin, getAllOrders);
app.get("/orders/:id/items", authenticate, getOrderDetails);
app.patch("/orders/:id/status", authenticate, requireAdmin, updateOrderStatus);

describe("Order API", () => {
    beforeEach(() => {
        resetMocks();
    });

    describe("POST /orders", () => {
        it("should create an order", async () => {
            const res = await request(app)
                .post("/orders")
                .set("Authorization", "Bearer client-token")
                .send({ items: [{ productId: "p1", quantity: 2, price: 50 }], total: 100 });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("orderId");
        });

        it("should return 401 without token", async () => {
            const res = await request(app)
                .post("/orders")
                .send({ items: [{ productId: "p1", quantity: 2, price: 50 }], total: 100 });

            expect(res.status).toBe(401);
        });

        it("should return 400 for missing items", async () => {
            const res = await request(app)
                .post("/orders")
                .set("Authorization", "Bearer client-token")
                .send({ total: 100 });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Items required");
        });

        it("should return 400 for missing total", async () => {
            const res = await request(app)
                .post("/orders")
                .set("Authorization", "Bearer client-token")
                .send({ items: [{ productId: "p1", quantity: 2, price: 50 }] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Total required");
        });
    });

    describe("GET /orders", () => {
        it("should return user orders", async () => {
            const res = await request(app)
                .get("/orders")
                .set("Authorization", "Bearer client-token");

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("data");
            expect(res.body).toHaveProperty("pagination");
        });

        it("should return 401 without token", async () => {
            const res = await request(app).get("/orders");

            expect(res.status).toBe(401);
        });
    });

    describe("GET /orders/all (Admin)", () => {
        it("should return all orders for admin", async () => {
            const res = await request(app)
                .get("/orders/all")
                .set("Authorization", "Bearer admin-token");

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        it("should return 403 for client", async () => {
            const res = await request(app)
                .get("/orders/all")
                .set("Authorization", "Bearer client-token");

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("Admin access required");
        });
    });

    describe("GET /orders/:id/items", () => {
        it("should return order details", async () => {
            const res = await request(app)
                .get("/orders/order-123/items")
                .set("Authorization", "Bearer client-token");

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("data");
        });
    });

    describe("PATCH /orders/:id/status", () => {
        it("should update order status for admin", async () => {
            const res = await request(app)
                .patch("/orders/order-123/status")
                .set("Authorization", "Bearer admin-token")
                .send({ status: "completed" });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Order status updated");
        });

        it("should return 403 for client", async () => {
            const res = await request(app)
                .patch("/orders/order-123/status")
                .set("Authorization", "Bearer client-token")
                .send({ status: "completed" });

            expect(res.status).toBe(403);
        });

        it("should return 400 for invalid status", async () => {
            const res = await request(app)
                .patch("/orders/order-123/status")
                .set("Authorization", "Bearer admin-token")
                .send({ status: "invalid" });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Invalid status");
        });
    });
});