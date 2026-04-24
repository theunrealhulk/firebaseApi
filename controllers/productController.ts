import type { Request, Response } from "express";
import { db } from "../utils/firebase.js";
import type { Query, DocumentData } from "firebase-admin/firestore";
import type { Product } from "../models/Product.js";
import type { ProductInput, ProductUpdateInput, SearchInput } from "../utils/validation.js";
import { toResponseProduct } from "../utils/responseTransform.js";
import { success, created } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

export const createProduct = async (req: Request, res: Response) => {
    const { name, price, description, stock, category, image } = req.body as ProductInput;

    try {
        const productRef = db.collection("products").doc();
        await productRef.set({
            name,
            price,
            description: description || "",
            stock: stock ?? 0,
            category: category || "",
            image: image || "",
            isActive: true,
            createdAt: new Date(),
        } satisfies Product);

        logger.info({ productId: productRef.id }, "Product created");

        return created(res, { id: productRef.id, name, price }, "Product created");
    } catch (err) {
        logger.error({ err }, "Failed to create product");
        throw new AppError(500, "Failed to create product");
    }
};

export const getProducts = async (req: Request, res: Response) => {
    const { page, limit, q, category, minPrice, maxPrice } = req.query as unknown as SearchInput;
    const search = (q || "").toLowerCase().trim();

    try {
        let query: Query<DocumentData> = db.collection("products").where("isActive", "==", true);

        if (category) {
            query = query.where("category", "==", category);
        }
        if (minPrice !== undefined) {
            query = query.where("price", ">=", minPrice);
        }
        if (maxPrice !== undefined) {
            query = query.where("price", "<=", maxPrice);
        }

        const snapshot = await query
            .orderBy("createdAt", "desc")
            .offset((page - 1) * limit)
            .limit(limit)
            .get();

        let products = snapshot.docs.map(doc => toResponseProduct(doc));

        if (search) {
            products = products.filter(p =>
                p.name.toLowerCase().includes(search) ||
                p.description.toLowerCase().includes(search)
            );
        }

        return success(res, products, undefined, {
            page,
            limit,
            total: products.length,
            totalPages: Math.ceil(products.length / limit),
        });
    } catch (err) {
        logger.error({ err }, "Failed to get products");
        throw new AppError(500, "Failed to get products");
    }
};

export const getProduct = async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
        const doc = await db.collection("products").doc(id).get();
        if (!doc.exists) {
            throw new AppError(404, "Product not found");
        }
        return success(res, toResponseProduct(doc));
    } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error({ err, id }, "Failed to get product");
        throw new AppError(500, "Failed to get product");
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updates = req.body as ProductUpdateInput;

    try {
        const doc = await db.collection("products").doc(id).get();
        if (!doc.exists) {
            throw new AppError(404, "Product not found");
        }

        await db.collection("products").doc(id).update({
            ...updates,
            updatedAt: new Date(),
        });

        logger.info({ productId: id }, "Product updated");
        return success(res, { id }, "Product updated");
    } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error({ err, id }, "Failed to update product");
        throw new AppError(500, "Failed to update product");
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
        const doc = await db.collection("products").doc(id).get();
        if (!doc.exists) {
            throw new AppError(404, "Product not found");
        }

        await db.collection("products").doc(id).delete();
        logger.info({ productId: id }, "Product deleted");
        return success(res, { id }, "Product deleted");
    } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error({ err, id }, "Failed to delete product");
        throw new AppError(500, "Failed to delete product");
    }
};