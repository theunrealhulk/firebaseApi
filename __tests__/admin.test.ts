import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import type { Request, Response } from "express";

jest.mock("../utils/firebase.js");
import { auth, db } from "../utils/firebase.js";

const mockAdmin = { uid: "admin-123", email: "admin@test.com", displayName: "Admin User", role: "admin" };
const mockClient = { uid: "client-123", email: "client@test.com", displayName: "Client User", role: "client" };

const mockUsers = [
    { uid: "admin-123", email: "admin@test.com", displayName: "Admin User", emailVerified: true, disabled: false, customClaims: { role: "admin" } },
    { uid: "client-123", email: "client@test.com", displayName: "Client User", emailVerified: true, disabled: false, customClaims: { role: "client" } },
];

const resetMocks = () => {
    jest.clearAllMocks();
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
const getAllUsers = async (req: Request, res: Response) => {
    try {
        const listUsers = await auth.listUsers();
        const users = listUsers.users.map((user: any) => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified,
            disabled: user.disabled,
            customClaims: user.customClaims,
        }));
        return res.json(users);
    } catch {
        return res.status(500).json({ error: "Failed to get users" });
    }
};

const setUserRole = async (req: Request, res: Response) => {
    const { uid, role } = req.body;
    if (!uid || !role) {
        return res.status(400).json({ error: "uid and role required" });
    }
    if (!["admin", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Use 'admin' or 'client'" });
    }
    try {
        await auth.setCustomUserClaims(uid, { role });
        return res.json({ message: `User ${uid} is now ${role}` });
    } catch {
        return res.status(500).json({ error: "Failed to set role" });
    }
};

const app = express();
app.use(express.json());
app.get("/admin/users", authenticate, requireAdmin, getAllUsers);
app.post("/admin/set-role", authenticate, requireAdmin, setUserRole);

describe("Admin API", () => {
    beforeEach(() => {
        resetMocks();
    });

    describe("GET /admin/users", () => {
        it("should return all users for admin", async () => {
            auth.listUsers = jest.fn<any>().mockResolvedValue({ users: mockUsers });

            const res = await request(app)
                .get("/admin/users")
                .set("Authorization", "Bearer admin-token");

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0]).toHaveProperty("uid");
            expect(res.body[0]).toHaveProperty("email");
        });

        it("should return 403 for client", async () => {
            const res = await request(app)
                .get("/admin/users")
                .set("Authorization", "Bearer client-token");

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("Admin access required");
        });

        it("should return 401 without token", async () => {
            const res = await request(app).get("/admin/users");

            expect(res.status).toBe(401);
        });
    });

    describe("POST /admin/set-role", () => {
        it("should set user role to admin", async () => {
            auth.setCustomUserClaims = jest.fn<any>().mockResolvedValue(undefined);

            const res = await request(app)
                .post("/admin/set-role")
                .set("Authorization", "Bearer admin-token")
                .send({ uid: "user-123", role: "admin" });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("User user-123 is now admin");
            expect(auth.setCustomUserClaims).toHaveBeenCalledWith("user-123", { role: "admin" });
        });

        it("should set user role to client", async () => {
            auth.setCustomUserClaims = jest.fn<any>().mockResolvedValue(undefined);

            const res = await request(app)
                .post("/admin/set-role")
                .set("Authorization", "Bearer admin-token")
                .send({ uid: "user-123", role: "client" });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("User user-123 is now client");
        });

        it("should return 400 for missing uid", async () => {
            const res = await request(app)
                .post("/admin/set-role")
                .set("Authorization", "Bearer admin-token")
                .send({ role: "admin" });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("uid and role required");
        });

        it("should return 400 for missing role", async () => {
            const res = await request(app)
                .post("/admin/set-role")
                .set("Authorization", "Bearer admin-token")
                .send({ uid: "user-123" });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("uid and role required");
        });

        it("should return 400 for invalid role", async () => {
            const res = await request(app)
                .post("/admin/set-role")
                .set("Authorization", "Bearer admin-token")
                .send({ uid: "user-123", role: "superadmin" });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Invalid role. Use 'admin' or 'client'");
        });

        it("should return 403 for client", async () => {
            const res = await request(app)
                .post("/admin/set-role")
                .set("Authorization", "Bearer client-token")
                .send({ uid: "user-123", role: "admin" });

            expect(res.status).toBe(403);
        });
    });
});