import type { Request, Response } from "express";
import { db, auth } from "../utils/firebase.js";
import type { Order } from "../models/Order.js";
import type { OrderItem } from "../models/OrderItem.js";
import { toResponseOrder, toResponseOrderItem } from "../utils/responseTransform.js";
import { getPaginationParams, createPaginatedResponse } from "../utils/pagination.js";

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

        await orderRef.set({
            userId,
            total,
            status: "pending",
            createdAt: new Date(),
        } satisfies Order);

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
    const { page, limit } = getPaginationParams(req.query);

    try {
        const totalSnapshot = await db.collection("orders").get();
        const total = totalSnapshot.size;

        const snapshot = await db.collection("orders")
            .orderBy("createdAt", "desc")
            .offset((page - 1) * limit)
            .limit(limit)
            .get();

        const orders = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const userData = await getUserData(doc.data()?.userId);
                return toResponseOrder(doc, userData);
            })
        );
        return res.json(createPaginatedResponse(orders, page, limit, total));
    } catch (err) {
        return res.status(500).json({ error: "Failed to get orders" });
    }
};

export const getUserOrders = async (req: Request, res: Response) => {
    if (!req.user?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.uid;
    const { page, limit } = getPaginationParams(req.query);

    try {
        const baseQuery = db.collection("orders").where("userId", "==", userId);
        const totalSnapshot = await baseQuery.get();
        const total = totalSnapshot.size;

        const snapshot = await baseQuery
            .orderBy("createdAt", "desc")
            .offset((page - 1) * limit)
            .limit(limit)
            .get();

        const userData = await getUserData(userId);
        const orders = snapshot.docs.map(doc => toResponseOrder(doc, userData));
        return res.json(createPaginatedResponse(orders, page, limit, total));
    } catch (err) {
        return res.status(500).json({ error: "Failed to get orders" });
    }
};

export const getOrderDetails = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { page, limit } = getPaginationParams(req.query);

    try {
        const baseQuery = db.collection("orderItems").where("orderId", "==", id);
        const totalSnapshot = await baseQuery.get();
        const total = totalSnapshot.size;

        const snapshot = await baseQuery
            .offset((page - 1) * limit)
            .limit(limit)
            .get();

        const items = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const productData = await getProductData(doc.data()?.productId);
                return toResponseOrderItem(doc, productData);
            })
        );
        return res.json(createPaginatedResponse(items, page, limit, total));
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

const getUserData = async (userId: string) => {
    try {
        const user = await auth.getUser(userId);
        return {
            name: user.displayName || "",
            email: user.email || "",
        };
    } catch {
        return { name: "", email: "" };
    }
};

const getProductData = async (productId: string) => {
    try {
        const doc = await db.collection("products").doc(productId).get();
        return doc.data() || {};
    } catch {
        return {};
    }
};