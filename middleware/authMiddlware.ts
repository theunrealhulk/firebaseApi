import type { Request, Response, NextFunction } from "express";
import { auth } from "../utils/firebase";
import type { DecodedIdToken } from "firebase-admin/auth";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    const token = authHeader.split("Bearer ")[1];
    try {
        if (token) {
            const decodedToken = await auth.verifyIdToken(token);;
            req.user = decodedToken as DecodedIdToken; 
            next();
        }
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }
};   