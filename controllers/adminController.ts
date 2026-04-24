import type { Request, Response } from "express";
import { auth } from "../utils/firebase.js";
import type { SetRoleInput, PaginationInput } from "../utils/validation.js";
import { success } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

export const setUserRole = async (req: Request, res: Response) => {
    const { uid, role } = req.body as SetRoleInput;

    try {
        await auth.setCustomUserClaims(uid, { role });
        logger.info({ uid, role }, "User role updated");
        return success(res, { uid, role }, `User ${uid} is now ${role}`);
    } catch (err) {
        logger.error({ err, uid }, "Failed to set role");
        throw new AppError(500, "Failed to set role");
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as PaginationInput;

    try {
        let allUsers: any[] = [];
        let nextPageToken: string | undefined;

        do {
            const listUsers = await auth.listUsers(100, nextPageToken);
            allUsers = [...allUsers, ...listUsers.users];
            nextPageToken = listUsers.pageToken;
        } while (nextPageToken && allUsers.length < page * limit);

        const start = (page - 1) * limit;
        const paginatedUsers = allUsers.slice(start, start + limit).map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified,
            disabled: user.disabled,
            customClaims: user.customClaims,
        }));

        return success(res, paginatedUsers, undefined, {
            page,
            limit,
            total: allUsers.length,
            totalPages: Math.ceil(allUsers.length / limit),
        });
    } catch (err) {
        logger.error({ err }, "Failed to get users");
        throw new AppError(500, "Failed to get users");
    }
};