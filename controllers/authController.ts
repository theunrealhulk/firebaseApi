import type { Request, Response } from "express";
import type { RegisterRequest, LoginRequest } from "../types/requests/auth.js";
import * as admin from "firebase-admin";
import { auth, db } from "../utils/firebase.js";


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
        if(userRecord){
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
    const { email, password } = req.body;
    // Firebase auth logic here
    res.json({ token: "..." });
};
export const refresh = async (req: Request, res: Response) => {
    // req.user is available from middleware
    res.json({ message: "Token refreshed" });
};
export const logout = async (req: Request, res: Response) => {
    res.json({ message: "Logged out" });
};