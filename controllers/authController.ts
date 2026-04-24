import type { Request, Response } from "express";
import type { RegisterRequest, LoginRequest } from "../types/requests/auth.js";
import { auth, db } from "../utils/firebase.js";
import "dotenv/config";

const isRegisterRequest = (body: RegisterRequest): body is RegisterRequest => {
    return "name" in body && "email" in body && "password" in body;
};

const isLoginRequest = (body: LoginRequest): body is RegisterRequest => {
    return "email" in body && "password" in body;
};


export const register = async (req: Request, res: Response) => {
    if (!isRegisterRequest(req.body)) {
        return res.status(400).json({ error: "Invalid registration data" });
    }
    const { name, email, password } = req.body;

    const validationErrors = []
    if (name.length < 3 || name.length > 100) {
        validationErrors.push({ name: "name length must be between 3 and 100 charachters" })
    }
    if (password.length < 8) {
        validationErrors.push({ password: "password length can't be less than 8 charachters" })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        validationErrors.push({ email: "must match a valid email address" })
    }
    if (validationErrors.length > 0) {
        return res.status(400).json(validationErrors)
    }

    let userRecord;
    try {
        // Create user in Firebase Auth
        userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });
        // Save user to Firestore
        const userDoc = {
            name,
            email,
            isActive: true,
            createdAt: new Date(),
        };
        await db.collection("users").doc(userRecord.uid).set(userDoc);
    } catch (err: any) {
        if (err.code === "auth/email-already-exists") {
            return res.status(400).json({ error: "Email already registered" });
        }
        if (userRecord) {
            await auth.deleteUser(userRecord.uid);
        }
        return res.status(500).json({ error: "Failed to create user" });
    }

    return res.status(201).json({
        message: "User created",
        uid: userRecord.uid,
        email: userRecord.email
    });
};

export const login = async (req: Request, res: Response) => {
    if (!isLoginRequest(req.body)) {
        return res.status(400).json({ error: "Invalid login data" });
    }
    const { email, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({ message: "invalid emial " })
    }
    // Firebase auth logic here
    try {
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    returnSecureToken: true,
                }),
            }
        );
        const data = await response.json();
        if (data.error) {
            return res.status(401).json({ error: data.error.message });
        }
        console.log("Firebase response:", data);
        res.cookie("refreshToken", data.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
        });
        return res.json({
            token: data.idToken,
            email: data.email,
            uid: data.localId,
            expiresIn: data.expiresIn,
        });
    } catch (err) {
        return res.status(500).json({ error: "Login failed" });
    }
};
export const refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
        return res.status(400).json({ error: "No refresh token provided" });
    }
    try {
        const response = await fetch(
            `https://securetoken.googleapis.com/v1/token?key=${process.env.FIREBASE_WEB_API_KEY}`,
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
        // Set new refresh token in cookie
        res.cookie("refreshToken", data.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 14 * 24 * 60 * 60 * 1000,
        });
        return res.json({
            token: data.id_token,
            expiresIn: data.expires_in,
        });
    } catch (err) {
        return res.status(500).json({ error: "Token refresh failed" });
    }
};
export const logout = async (req: Request, res: Response) => {
    const uid = req.user?.uid;  // From auth middleware
    try {
        await auth.revokeRefreshTokens(uid);

        // Clear refresh token cookie if stored
        res.clearCookie("refreshToken");
        return res.json({ message: "Logged out successfully" });
    } catch (err) {
        return res.status(500).json({ error: "Logout failed" });
    }
};