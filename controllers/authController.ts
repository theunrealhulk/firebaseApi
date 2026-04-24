import type { Request, Response } from "express";
import type { RegisterInput, LoginInput } from "../utils/validation.js";
import { auth } from "../utils/firebase.js";
import { success, created } from "../utils/response.js";
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

export const register = async (req: Request, res: Response) => {
    const { name, email, password } = req.body as RegisterInput;

    try {
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        logger.info({ uid: userRecord.uid, email: userRecord.email }, "User registered");

        return created(res, {
            uid: userRecord.uid,
            email: userRecord.email,
            name: userRecord.displayName,
        }, "User registered");
    } catch (err: any) {
        if (err.code === "auth/email-already-exists") {
            throw new AppError(400, "Email already registered");
        }
        logger.error({ err, email }, "Failed to register user");
        throw new AppError(500, "Failed to create user");
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginInput;

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
        return success(res, {
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
        return success(res, {
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
        return success(res, null, "Logged out successfully");
    } catch (err) {
        logger.error({ err, uid }, "Logout failed");
        throw new AppError(500, "Logout failed");
    }
};