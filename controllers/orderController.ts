import type { Request, Response } from "express";
import { db } from "../utils/firebase.js";
import type { Order } from "../models/Order.js";
import type { OrderItem } from "../models/OrderItem.js";

export const createOrder = async (req: Request, res: Response) => {
    if (!req.user?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { items, total } = req.body;
    const userId = req.user.uid;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items required" });
    }

    if (!total) {
        return res.status(400).json({ error: "Total required" });
    }

    try {
        const orderRef = db.collection("orders").doc();
        const orderId = orderRef.id;

        // Create order
        await orderRef.set({
            userId,
            total,
            status: "pending",
            createdAt: new Date(),
        } satisfies Order);

        // Create order items
        const batch = db.batch();
        for (const item of items) {
            const itemRef = db.collection("orderItems").doc();
            batch.set(itemRef, {
                orderId,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
            } satisfies OrderItem);
        }
        await batch.commit();

        return res.status(201).json({ 
            orderId,
            message: "Order created" 
        });
    } catch (err) {
        return res.status(500).json({ error: "Failed to create order" });
    }
};

export const getOrders = async (req: Request, res: Response) => {
    try {
        const snapshot = await db.collection("orders").get();
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        return res.json(orders);
    } catch (err) {
        return res.status(500).json({ error: "Failed to get orders" });
    }
};

export const getUserOrders = async (req: Request, res: Response) => {
    if (!req.user?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.uid;

    try {
        const snapshot = await db.collection("orders")
            .where("userId", "==", userId)
            .get();
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        return res.json(orders);
    } catch (err) {
        return res.status(500).json({ error: "Failed to get orders" });
    }
};

export const getOrderDetails = async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
        const snapshot = await db.collection("orderItems")
            .where("orderId", "==", id)
            .get();
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        return res.json(items);
    } catch (err) {
        return res.status(500).json({ error: "Failed to get order items" });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses = ["pending", "processing", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        await db.collection("orders").doc(id).update({ status });
        return res.json({ message: "Order status updated" });
    } catch (err) {
        return res.status(500).json({ error: "Failed to update order" });
    }
};