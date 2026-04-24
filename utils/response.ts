import type { Response } from "express";

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const success = <T>(res: Response, data: T, message?: string, pagination?: ApiResponse["pagination"]) => {
    const response: ApiResponse<T> = { success: true, data };
    if (message) response.message = message;
    if (pagination) response.pagination = pagination;
    return res.json(response);
};

export const created = <T>(res: Response, data: T, message?: string) => {
    const response: ApiResponse<T> = { success: true, data };
    if (message) response.message = message;
    return res.status(201).json(response);
};

export const noContent = (res: Response) => {
    return res.status(204).end();
};

export const error = (res: Response, statusCode: number, message: string) => {
    return res.status(statusCode).json({ success: false, error: message });
};