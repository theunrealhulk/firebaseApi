import type { Request, Response } from "express";
import { db } from "../utils/firebase.js";
import type { Product } from "../models/Product.js";
import { toResponseProduct } from "../utils/responseTransform.js";
import { getPaginationParams, createPaginatedResponse } from "../utils/pagination.js";

export const createProduct = async (req: Request, res: Response) => {
    const { name, price, description } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: "Name and price required" });
    }

    try {
        const productRef = db.collection("products").doc();
        await productRef.set({
            name,
            price,
            description: description || "",
            isActive: true,
            createdAt: new Date(),
        } satisfies Product);

        return res.status(201).json({ 
            id: productRef.id,
            message: "Product created" 
        });
    } catch (err) {
        return res.status(500).json({ error: "Failed to create product" });
    }
};

export const getProducts = async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req.query);

    try {
        const totalSnapshot = await db.collection("products").get();
        const total = totalSnapshot.size;

        const snapshot = await db.collection("products")
            .orderBy("createdAt", "desc")
            .offset((page - 1) * limit)
            .limit(limit)
            .get();

        const products = snapshot.docs.map(doc => toResponseProduct(doc));
        return res.json(createPaginatedResponse(products, page, limit, total));
    } catch (err) {
        return res.status(500).json({ error: "Failed to get products" });
    }
};

export const getProduct = async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
        const doc = await db.collection("products").doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: "Product not found" });
        }
        return res.json(toResponseProduct(doc));
    } catch (err) {
        return res.status(500).json({ error: "Failed to get product" });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, price, description, isActive } = req.body;

    try {
        await db.collection("products").doc(id).update({
            ...(name && { name }),
            ...(price && { price }),
            ...(description !== undefined && { description }),
            ...(isActive !== undefined && { isActive }),
        });
        return res.json({ message: "Product updated" });
    } catch (err) {
        return res.status(500).json({ error: "Failed to update product" });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
        await db.collection("products").doc(id).delete();
        return res.json({ message: "Product deleted" });
    } catch (err) {
        return res.status(500).json({ error: "Failed to delete product" });
    }
};