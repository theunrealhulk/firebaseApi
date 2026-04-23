import type { Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];
 
    
    try {
        if(idToken){
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            req.user = decodedToken; // Attach user data to request
            next();
        }
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }
};   