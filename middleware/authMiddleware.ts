import type { Request, Response, NextFunction } from "express";
import { auth } from "../utils/firebase.js";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1] as string;

    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken as any;
        next();
    } catch (err: any) {
        if (err.code === "auth/id-token-expired") {
            return res.status(401).json({ 
                error: "Token expired",
                code: "TOKEN_EXPIRED" 
            });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
};

export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};