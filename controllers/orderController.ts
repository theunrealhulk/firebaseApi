import type { Request, Response } from "express";
import { db, auth } from "../utils/firebase.js";
import type { Order } from "../models/Order.js";
import type { OrderItem } from "../models/OrderItem.js";
import type { OrderInput, PaginationInput } from "../utils/validation.js";
import { toResponseOrder, toResponseOrderItem } from "../utils/responseTransform.js";
import { success, created } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

export const createOrder = async (req: Request, res: Response) => {
    const userId = req.user?.uid;
    if (!userId) {
        throw new AppError(401, "Unauthorized");
    }

    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError(400, "Items required");
    }
    if (!total) {
        throw new AppError(400, "Total required");
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

        logger.info({ orderId, userId }, "Order created");
        return created(res, { orderId }, "Order created");
    } catch (err) {
        logger.error({ err }, "Failed to create order");
        throw new AppError(500, "Failed to create order");
    }
};

export const getOrders = async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as PaginationInput;

    try {
        const totalSnapshot = await db.collection("orders").count().get();
        const total = totalSnapshot.data().count;

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
        return success(res, orders, undefined, {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        logger.error({ err }, "Failed to get orders");
        throw new AppError(500, "Failed to get orders");
    }
};

export const getUserOrders = async (req: Request, res: Response) => {
    const userId = req.user?.uid;
    if (!userId) {
        throw new AppError(401, "Unauthorized");
    }

    const { page, limit } = req.query as unknown as PaginationInput;

    try {
        const baseQuery = db.collection("orders").where("userId", "==", userId);
        const totalSnapshot = await baseQuery.count().get();
        const total = totalSnapshot.data().count;

        const snapshot = await baseQuery
            .orderBy("createdAt", "desc")
            .offset((page - 1) * limit)
            .limit(limit)
            .get();

        const userData = await getUserData(userId);
        const orders = snapshot.docs.map(doc => toResponseOrder(doc, userData));
        return success(res, orders, undefined, {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        logger.error({ err }, "Failed to get orders");
        throw new AppError(500, "Failed to get orders");
    }
};

export const getOrderDetails = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { page, limit } = req.query as unknown as PaginationInput;

    try {
        const baseQuery = db.collection("orderItems").where("orderId", "==", id);
        const totalSnapshot = await baseQuery.count().get();
        const total = totalSnapshot.data().count;

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
        return success(res, items, undefined, {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        logger.error({ err }, "Failed to get order items");
        throw new AppError(500, "Failed to get order items");
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses = ["pending", "processing", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
        throw new AppError(400, "Invalid status");
    }

    try {
        await db.collection("orders").doc(id).update({ status });
        logger.info({ orderId: id, status }, "Order status updated");
        return success(res, { orderId: id, status }, "Order status updated");
    } catch (err) {
        logger.error({ err }, "Failed to update order");
        throw new AppError(500, "Failed to update order");
    }
};

const getUserData = async (userId: string) => {
    try {
        const user = await auth.getUser(userId);
        return { name: user.displayName || "", email: user.email || "" };
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