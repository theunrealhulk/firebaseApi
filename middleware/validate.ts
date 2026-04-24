import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../utils/errors.js";

export const validate = (schema: z.ZodSchema, source: "body" | "query" | "params" = "body") => {
    return (req: Request, res: Response, next: NextFunction) => {
        const data = source === "body" ? req.body : source === "query" ? req.query : req.params;
        const result = schema.safeParse(data);
        
        if (!result.success) {
            const errors = result.error.issues.map(issue => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw new AppError(400, JSON.stringify(errors));
        }
        
        if (source === "body") req.body = result.data;
        else if (source === "query") req.query = result.data as any;
        
        next();
    };
};