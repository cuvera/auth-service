import { Request, Response } from 'express';
import supportService from '../services/supportService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export const whitelistUsers = catchAsync(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
    }

    const { users } = req.body;
    if (!users) {
        throw new AppError('Users data is required', 400);
    }

    const usersToWhitelist = Array.isArray(users) ? users : [users];
    const whitelistedUsers = await supportService.whitelistUsers(usersToWhitelist, tenantId);

    res.status(201).json({
        status: 'success',
        results: whitelistedUsers.length,
        data: {
            whitelistedUsers,
        },
    });
});

export const getWhitelistedUsers = catchAsync(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1) throw new AppError('Page must be greater than 0', 400);
    if (limit < 1 || limit > 100) throw new AppError('Limit must be between 1 and 100', 400);

    const result = await supportService.getAllWhitelistedUsers(tenantId, page, limit);

    res.status(200).json({
        status: 'success',
        results: result.users.length,
        data: {
            whitelistedUsers: result.users,
            totalCount: result.totalCount,
            page,
            limit,
            totalPages: result.totalPages,
        },
    });
});

export const updateWhitelistedUser = catchAsync(async (req: Request, res: Response) => {
    const { email: oldEmail } = req.params;
    const { email: newEmail } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
    }
    if (!newEmail) {
        throw new AppError('New email is required in request body', 400);
    }

    const updatedUser = await supportService.updateWhitelistedUserEmail(oldEmail, newEmail, tenantId);
    if (!updatedUser) {
        throw new AppError('Whitelisted user not found', 404);
    }

    res.status(200).json({
        status: 'success',
        data: {
            whitelistedUser: updatedUser,
        },
    });
});

export const deleteWhitelistedUser = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
    }

    const deletedUser = await supportService.deleteWhitelistedUserByEmail(email, tenantId);

    if (!deletedUser) {
        throw new AppError('Whitelisted user not found', 404);
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});

// Alias for compatibility during transition if needed
export const importUsers = whitelistUsers;
export const getImportedUsers = getWhitelistedUsers;
export const updateImportedUser = updateWhitelistedUser;
export const deleteImportedUser = deleteWhitelistedUser;
