import { Request, Response } from 'express';
import supportService from '../services/supportService';
import { SupportUser, WhitelistedUser } from '../models/Support';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { IApiResponse } from '../interfaces';

export const whitelistUsers = catchAsync(async (req: Request, res: Response) => {
    const tenantId = (req.headers['x-tenant-id'] || req.headers['tenant-id'] || req.headers['tenet-id'] || req.headers['tenent-id'] || (req.user as any)?.tenantId) as string;
    if (!tenantId) {
        throw new AppError('Tenant ID is required in headers or bearer token', 400);
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
    const tenantId = (req.headers['x-tenant-id'] || req.headers['tenant-id'] || req.headers['tenet-id'] || req.headers['tenent-id'] || (req.user as any)?.tenantId) as string;
    if (!tenantId) {
        throw new AppError('Tenant ID is required in headers or bearer token', 400);
    }

    const whitelistedUsers = await supportService.getAllWhitelistedUsers(tenantId);

    res.status(200).json({
        status: 'success',
        results: whitelistedUsers.length,
        data: {
            whitelistedUsers,
        },
    });
});

export const updateWhitelistedUser = catchAsync(async (req: Request, res: Response) => {
    const { email: oldEmail } = req.params;
    const { email: newEmail } = req.body;
    const tenantId = (req.headers['x-tenant-id'] || req.headers['tenant-id'] || req.headers['tenet-id'] || req.headers['tenent-id'] || (req.user as any)?.tenantId) as string;

    if (!tenantId) {
        throw new AppError('Tenant ID is required in headers or bearer token', 400);
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
    const tenantId = (req.headers['x-tenant-id'] || req.headers['tenant-id'] || req.headers['tenet-id'] || req.headers['tenent-id'] || (req.user as any)?.tenantId) as string;

    if (!tenantId) {
        throw new AppError('Tenant ID is required in headers or bearer token', 400);
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

// --- User Controllers ---

export const getUsers = catchAsync(async (req: Request, res: Response) => {
    const tenantId = (req.headers['x-tenant-id'] || req.headers['tenant-id'] || req.headers['tenet-id'] || req.headers['tenent-id'] || (req.user as any)?.tenantId) as string;

    console.log('--- GET Users Debug Log ---');
    console.log('Tenant ID found:', tenantId);

    if (!tenantId) {
        throw new AppError('Tenant ID is required in headers or bearer token', 400);
    }

    const { email, employeeId, name, department, designation } = req.query;

    const query: any = { tenantId };
    if (email) query.email = (email as string).toLowerCase();
    if (employeeId) query.employeeId = employeeId;
    if (name) query.name = { $regex: name, $options: 'i' };
    if (department) query.department = { $regex: department, $options: 'i' };
    if (designation) query.designation = { $regex: designation, $options: 'i' };

    console.log('Search Query:', JSON.stringify(query));

    const users = await SupportUser.find(query).select('-password -googleId -avatar -provider');
    console.log('Users count:', users.length);

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users,
        },
    });
});

export const getUserById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = (req.headers['x-tenant-id'] || req.headers['tenant-id'] || req.headers['tenet-id'] || req.headers['tenent-id'] || (req.user as any)?.tenantId) as string;

    if (!tenantId) {
        throw new AppError('Tenant ID is required in headers or bearer token', 400);
    }

    const user = await supportService.getUserById(id);

    if (!user || user.tenantId !== tenantId) {
        throw new AppError('User not found in this tenant', 404);
    }

    res.status(200).json({
        status: 'success',
        data: {
            user,
        },
    });
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = (req.headers['x-tenant-id'] || req.headers['tenant-id'] || req.headers['tenet-id'] || req.headers['tenent-id'] || (req.user as any)?.tenantId) as string;
    const updateData = req.body;

    if (!tenantId) {
        throw new AppError('Tenant ID is required in headers or bearer token', 400);
    }

    // First ensure the user exists and belongs to this tenant
    const user = await supportService.getUserById(id);
    if (!user || user.tenantId !== tenantId) {
        throw new AppError('User not found in this tenant', 404);
    }

    // Prevent moving user to another tenant via this API if tenantId is in body
    if (updateData.tenantId && updateData.tenantId !== tenantId) {
        throw new AppError('Cannot change tenantId through this API', 400);
    }

    const updatedUser = await supportService.updateUser(id, updateData);

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});
