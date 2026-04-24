import { Router } from "express";
import type { Request, Response } from "express";
import { auth, db } from "../utils/firebase.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
    let healthy = true;

    const checkFirebaseAuth = async () => {
        const start = Date.now();
        try {
            await auth.listUsers(1);
            checks.firebaseAuth = { status: "up", latency: Date.now() - start };
        } catch (err: any) {
            healthy = false;
            checks.firebaseAuth = { status: "down", error: err.message };
        }
    };

    const checkFirestore = async () => {
        const start = Date.now();
        try {
            await db.collection("_health").limit(1).get();
            checks.firestore = { status: "up", latency: Date.now() - start };
        } catch (err: any) {
            healthy = false;
            checks.firestore = { status: "down", error: err.message };
        }
    };

    await Promise.all([checkFirebaseAuth(), checkFirestore()]);

    res.status(healthy ? 200 : 503).json({
        status: healthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
    });
});

router.get("/live", (_req: Request, res: Response) => {
    res.json({ status: "alive", timestamp: new Date().toISOString() });
});

router.get("/ready", async (_req: Request, res: Response) => {
    try {
        await auth.listUsers(1);
        res.json({ status: "ready", timestamp: new Date().toISOString() });
    } catch {
        res.status(503).json({ status: "not ready", timestamp: new Date().toISOString() });
    }
});

export default router;