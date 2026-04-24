import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof AppError) {
        logger.warn({
            statusCode: err.statusCode,
            message: err.message,
            path: req.path,
            method: req.method,
        });
        return res.status(err.statusCode).json({ error: err.message });
    }

    logger.error({
        err: {
            name: err.name,
            message: err.message,
            stack: err.stack,
        },
        path: req.path,
        method: req.method,
    });

    res.status(500).json({ error: "Internal server error" });
};

export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({ error: `Route ${req.path} not found` });
};