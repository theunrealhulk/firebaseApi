import type { Request, Response } from "express";
import type { RegisterRequest, LoginRequest } from "../types/requests/auth.js";
import { auth } from "../utils/firebase.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import "dotenv/config";

interface FirebaseAuthResponse {
    idToken?: string;
    email?: string;
    localId?: string;
    refreshToken?: string;
    expiresIn?: string;
    error?: { message: string };
}

interface FirebaseTokenResponse {
    id_token?: string;
    expires_in?: string;
    refresh_token?: string;
    error?: { message: string };
}

const isRegisterRequest = (body: unknown): body is RegisterRequest => {
    const b = body as Record<string, unknown>;
    return "name" in b && "email" in b && "password" in b;
};

const isLoginRequest = (body: unknown): body is LoginRequest => {
    const b = body as Record<string, unknown>;
    return "email" in b && "password" in b;
};

export const register = async (req: Request, res: Response) => {
    if (!isRegisterRequest(req.body)) {
        return res.status(400).json({ error: "Invalid registration data" });
    }
    const { name, email, password } = req.body;

    const validationErrors: Array<Record<string, string>> = [];
    if (name.length < 3 || name.length > 100) {
        validationErrors.push({ name: "name length must be between 3 and 100 characters" });
    }
    if (password.length < 8) {
        validationErrors.push({ password: "password length can't be less than 8 characters" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        validationErrors.push({ email: "must match a valid email address" });
    }
    if (validationErrors.length > 0) {
        return res.status(400).json(validationErrors);
    }

    try {
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        logger.info({ uid: userRecord.uid, email: userRecord.email }, "User registered");

        return res.status(201).json({
            uid: userRecord.uid,
            email: userRecord.email,
            name: userRecord.displayName,
        });
    } catch (err: any) {
        if (err.code === "auth/email-already-exists") {
            throw new AppError(400, "Email already registered");
        }
        logger.error({ err, email }, "Failed to register user");
        throw new AppError(500, "Failed to create user");
    }
};

export const login = async (req: Request, res: Response) => {
    if (!isLoginRequest(req.body)) {
        throw new AppError(400, "Invalid login data");
    }
    const { email, password } = req.body;

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
        const data = await response.json() as FirebaseAuthResponse;
        if (data.error) {
            throw new AppError(401, data.error.message);
        }
        
        logger.info({ uid: data.localId }, "User logged in");

        res.cookie("refreshToken", data.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 14 * 24 * 60 * 60 * 1000,
        });
        return res.json({
            token: data.idToken,
            email: data.email,
            uid: data.localId,
            expiresIn: data.expiresIn,
        });
    } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error({ err, email }, "Login failed");
        throw new AppError(500, "Login failed");
    }
};

export const refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
        throw new AppError(400, "No refresh token provided");
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
        const data = await response.json() as FirebaseTokenResponse;
        if (data.error) {
            throw new AppError(401, data.error.message);
        }
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
        if (err instanceof AppError) throw err;
        logger.error({ err }, "Token refresh failed");
        throw new AppError(500, "Token refresh failed");
    }
};

export const logout = async (req: Request, res: Response) => {
    const uid = req.user?.uid;
    if (!uid) {
        throw new AppError(400, "User ID required");
    }
    try {
        await auth.revokeRefreshTokens(uid);
        logger.info({ uid }, "User logged out");
        res.clearCookie("refreshToken");
        return res.json({ message: "Logged out successfully" });
    } catch (err) {
        logger.error({ err, uid }, "Logout failed");
        throw new AppError(500, "Logout failed");
    }
};