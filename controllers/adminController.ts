import type { Request, Response } from "express";
import { auth } from "../utils/firebase.js";

export const setUserRole = async (req: Request, res: Response) => {
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
    } catch (err) {
        return res.status(500).json({ error: "Failed to set role" });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const listUsers = await auth.listUsers();
        const users = listUsers.users.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified,
            disabled: user.disabled,
            customClaims: user.customClaims,
        }));
        return res.json(users);
    } catch (err) {
        return res.status(500).json({ error: "Failed to get users" });
    }
};