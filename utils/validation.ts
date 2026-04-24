import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().min(3, "name must be at least 3 characters").max(100, "name must be at most 100 characters"),
    email: z.string().email("invalid email format"),
    password: z.string().min(8, "password must be at least 8 characters"),
});

export const loginSchema = z.object({
    email: z.string().email("invalid email format"),
    password: z.string().min(1, "password is required"),
});

export const refreshSchema = z.object({
    refreshToken: z.string().optional(),
});

export const productSchema = z.object({
    name: z.string().min(1, "name is required").max(255, "name too long"),
    description: z.string().max(1000, "description too long").optional(),
    price: z.number().positive("price must be positive").max(999999.99, "price too high"),
    stock: z.number().int().min(0, "stock cannot be negative").optional(),
    category: z.string().max(100, "category too long").optional(),
    image: z.string().url("invalid image URL").optional().or(z.literal("")),
});

export const productUpdateSchema = productSchema.partial();

export const orderSchema = z.object({
    productId: z.string().min(1, "productId is required"),
    quantity: z.number().int().min(1, "quantity must be at least 1"),
    notes: z.string().max(500, "notes too long").optional(),
});

export const setRoleSchema = z.object({
    uid: z.string().min(1, "uid is required"),
    role: z.enum(["admin", "client", "moderator"]),
});

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = paginationSchema.extend({
    q: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type SetRoleInput = z.infer<typeof setRoleSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;