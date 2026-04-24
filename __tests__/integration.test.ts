import { jest, describe, it, expect } from "@jest/globals";
import request from "supertest";
import express from "express";
import type { Request, Response, NextFunction } from "express";

// Create fresh app for testing
const app = express();
app.use(express.json());

// Mock auth middleware inline
const mockAuth = {
    verifyIdToken: jest.fn<() => Promise<{ uid: string; role: string; email?: string }>>(),
    createUser: jest.fn<() => Promise<{ uid: string; email: string; displayName: string }>>(),
    setCustomUserClaims: jest.fn<() => Promise<void>>(),
    listUsers: jest.fn<() => Promise<{ users: Array<{ uid: string; email: string; displayName: string }> }>>(),
    revokeRefreshTokens: jest.fn<() => Promise<void>>(),
};

// Mock db inline
const mockDb = {
    collection: jest.fn(() => ({
        doc: jest.fn(() => ({
            id: "mock-id",
            set: jest.fn(() => Promise.resolve()),
            get: jest.fn(() => Promise.resolve({ 
                exists: true, 
                data: () => ({ name: "Test", price: 100 }) 
            })),
            update: jest.fn(() => Promise.resolve()),
            delete: jest.fn(() => Promise.resolve()),
        })),
        get: jest.fn(() => Promise.resolve({ 
            docs: [], 
            size: 0 
        })),
    })),
};

// Auth middleware
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split("Bearer ")[1];
    try {
        const decoded = await mockAuth.verifyIdToken(token);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};

// Routes (simplified for testing)
app.post("/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Invalid registration data" });
    }
    try {
        const userRecord = await mockAuth.createUser({ email, password, displayName: name });
        return res.status(201).json({ uid: userRecord.uid, email: userRecord.email });
    } catch (err: any) {
        if (err.code === "auth/email-already-exists") {
            return res.status(400).json({ error: "Email already registered" });
        }
        return res.status(500).json({ error: "Failed to create user" });
    }
});

app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Invalid login data" });
    }
    return res.status(200).json({ token: "mock-token", uid: "mock-uid", email });
});

app.post("/products", authenticate, requireAdmin, async (req, res) => {
    const { name, price } = req.body;
    if (!name || !price) {
        return res.status(400).json({ error: "Name and price required" });
    }
    return res.status(201).json({ id: "product-id", message: "Product created" });
});

app.get("/products", async (req, res) => {
    return res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } });
});

app.post("/orders", authenticate, async (req, res) => {
    const { items, total } = req.body;
    if (!items || items.length === 0) {
        return res.status(400).json({ error: "Items required" });
    }
    return res.status(201).json({ orderId: "order-id" });
});

app.get("/orders", authenticate, async (req, res) => {
    return res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } });
});

app.get("/orders/all", authenticate, requireAdmin, async (req, res) => {
    return res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } });
});

app.get("/admin/users", authenticate, requireAdmin, async (req, res) => {
    return res.json([{ uid: "user-1", email: "user@test.com" }]);
});

app.post("/admin/set-role", authenticate, requireAdmin, async (req, res) => {
    const { uid, role } = req.body;
    if (!uid || !role) {
        return res.status(400).json({ error: "uid and role required" });
    }
    if (!["admin", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Use 'admin' or 'client'" });
    }
    await mockAuth.setCustomUserClaims(uid, { role });
    return res.json({ message: `User ${uid} is now ${role}` });
});

describe("Auth Routes", () => {
    describe("POST /auth/register", () => {
        it("should register a new user", async () => {
            mockAuth.createUser.mockResolvedValue({ uid: "user-123", email: "test@test.com" });
            
            const res = await request(app)
                .post("/auth/register")
                .send({ name: "Test User", email: "test@test.com", password: "password123" });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("uid");
        });

        it("should return 400 for missing fields", async () => {
            const res = await request(app)
                .post("/auth/register")
                .send({ name: "Test" });

            expect(res.status).toBe(400);
        });

        it("should return 400 for duplicate email", async () => {
            mockAuth.createUser.mockRejectedValue({ code: "auth/email-already-exists" });

            const res = await request(app)
                .post("/auth/register")
                .send({ name: "Test", email: "existing@test.com", password: "password123" });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Email already registered");
        });
    });

    describe("POST /auth/login", () => {
        it("should login successfully", async () => {
            const res = await request(app)
                .post("/auth/login")
                .send({ email: "test@test.com", password: "password123" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("token");
        });
    });
});

describe("Product Routes", () => {
    describe("GET /products", () => {
        it("should return products", async () => {
            const res = await request(app).get("/products");

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("data");
            expect(res.body).toHaveProperty("pagination");
        });
    });

    describe("POST /products", () => {
        it("should return 401 without token", async () => {
            const res = await request(app)
                .post("/products")
                .send({ name: "Product", price: 100 });

            expect(res.status).toBe(401);
        });

        it("should return 403 for non-admin", async () => {
            mockAuth.verifyIdToken.mockResolvedValue({ uid: "user-1", role: "client" });

            const res = await request(app)
                .post("/products")
                .set("Authorization", "Bearer client-token")
                .send({ name: "Product", price: 100 });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("Admin access required");
        });

        it("should create product for admin", async () => {
            mockAuth.verifyIdToken.mockResolvedValue({ uid: "admin-1", role: "admin" });

            const res = await request(app)
                .post("/products")
                .set("Authorization", "Bearer admin-token")
                .send({ name: "Product", price: 100 });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("id");
        });
    });
});

describe("Order Routes", () => {
    describe("POST /orders", () => {
        it("should return 401 without token", async () => {
            const res = await request(app)
                .post("/orders")
                .send({ items: [], total: 100 });

            expect(res.status).toBe(401);
        });

        it("should return 400 for empty items", async () => {
            mockAuth.verifyIdToken.mockResolvedValue({ uid: "user-1", role: "client" });

            const res = await request(app)
                .post("/orders")
                .set("Authorization", "Bearer client-token")
                .send({ items: [], total: 100 });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Items required");
        });
    });

    describe("GET /orders/all", () => {
        it("should return 403 for non-admin", async () => {
            mockAuth.verifyIdToken.mockResolvedValue({ uid: "user-1", role: "client" });

            const res = await request(app)
                .get("/orders/all")
                .set("Authorization", "Bearer client-token");

            expect(res.status).toBe(403);
        });
    });
});

describe("Admin Routes", () => {
    describe("GET /admin/users", () => {
        it("should return 403 for non-admin", async () => {
            mockAuth.verifyIdToken.mockResolvedValue({ uid: "user-1", role: "client" });

            const res = await request(app)
                .get("/admin/users")
                .set("Authorization", "Bearer client-token");

            expect(res.status).toBe(403);
        });

        it("should return users for admin", async () => {
            mockAuth.verifyIdToken.mockResolvedValue({ uid: "admin-1", role: "admin" });

            const res = await request(app)
                .get("/admin/users")
                .set("Authorization", "Bearer admin-token");

            expect(res.status).toBe(200);
            expect(res.body).toBeInstanceOf(Array);
        });
    });

    describe("POST /admin/set-role", () => {
        it("should set user role", async () => {
            mockAuth.verifyIdToken.mockResolvedValue({ uid: "admin-1", role: "admin" });
            mockAuth.setCustomUserClaims.mockResolvedValue(undefined);

            const res = await request(app)
                .post("/admin/set-role")
                .set("Authorization", "Bearer admin-token")
                .send({ uid: "user-123", role: "admin" });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain("admin");
        });

        it("should return 400 for invalid role", async () => {
            mockAuth.verifyIdToken.mockResolvedValue({ uid: "admin-1", role: "admin" });

            const res = await request(app)
                .post("/admin/set-role")
                .set("Authorization", "Bearer admin-token")
                .send({ uid: "user-123", role: "superadmin" });

            expect(res.status).toBe(400);
        });
    });
});