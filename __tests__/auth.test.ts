import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

jest.mock("../utils/firebase.js");
import { auth } from "../utils/firebase.js";

const app = express();
app.use(express.json());

// Mock login endpoint
app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }
    try {
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test-key`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, returnSecureToken: true }),
            }
        );
        const data = await response.json();
        if (data.error) {
            return res.status(401).json({ error: data.error.message });
        }
        return res.json({
            token: data.idToken,
            uid: data.localId,
            email: data.email,
            expiresIn: data.expiresIn,
        });
    } catch {
        return res.status(500).json({ error: "Login failed" });
    }
});

// Mock refresh endpoint
let refreshTokenStore = "";
app.post("/auth/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: "No refresh token provided" });
    }
    try {
        const response = await fetch(
            `https://securetoken.googleapis.com/v1/token?key=test-key`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: refreshToken,
                }),
            }
        );
        const data = await response.json();
        if (data.error) {
            return res.status(401).json({ error: data.error.message });
        }
        return res.json({
            token: data.id_token,
            expiresIn: data.expires_in,
        });
    } catch {
        return res.status(500).json({ error: "Token refresh failed" });
    }
});

// Mock logout endpoint
app.post("/auth/logout", async (req, res) => {
    const uid = req.body?.uid;
    if (!uid) {
        return res.status(400).json({ error: "User ID required" });
    }
    try {
        await auth.revokeRefreshTokens(uid);
        return res.json({ message: "Logged out successfully" });
    } catch {
        return res.status(500).json({ error: "Logout failed" });
    }
});

describe("Auth API - Login", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 for missing email", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ password: "password123" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Email and password required");
    });

    it("should return 400 for missing password", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ email: "test@test.com" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Email and password required");
    });
});

describe("Auth API - Refresh", () => {
    it("should return 400 for missing refresh token", async () => {
        const res = await request(app)
            .post("/auth/refresh")
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("No refresh token provided");
    });
});

describe("Auth API - Logout", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 for missing uid", async () => {
        const res = await request(app)
            .post("/auth/logout")
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("User ID required");
    });

    it("should logout successfully", async () => {
        auth.revokeRefreshTokens = jest.fn<any>().mockResolvedValue(undefined);

        const res = await request(app)
            .post("/auth/logout")
            .send({ uid: "test-uid" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Logged out successfully");
        expect(auth.revokeRefreshTokens).toHaveBeenCalledWith("test-uid");
    });
});