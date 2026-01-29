import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import ImportedUser from '../models/ImportedUser';

export const createWhitelistedUser = catchAsync(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Tenant identification failed. Bearer token is required.', 401);
    }

    const { users } = req.body;
    if (!users) {
        throw new AppError('users field is required', 400);
    }

    const usersArray = Array.isArray(users) ? users : [users];
    const emails = usersArray.map((u: any) => u.email).filter(Boolean);

    if (emails.length === 0) {
        throw new AppError('At least one valid email is required', 400);
    }

    const whitelistedUsers = await Promise.all(
        emails.map((email: string) =>
            ImportedUser.findOneAndUpdate(
                { email, tenantId },
                { email, tenantId, importedAt: new Date() },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )
        )
    );

    res.status(201).json({
        status: 'success',
        results: whitelistedUsers.length,
        data: {
            whitelistedUsers
        }
    });
});


export const getWhitelistedUsers = catchAsync(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Tenant identification failed. Bearer token is required.', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
        ImportedUser.find({ tenantId }).skip(skip).limit(limit),
        ImportedUser.countDocuments({ tenantId })
    ]);

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    });
});

export const updateWhitelistedUser = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Tenant identification failed. Bearer token is required.', 401);
    }

    const { email: newEmail } = req.body;
    if (!newEmail) {
        throw new AppError('New email is required in the request body', 400);
    }

    const user = await ImportedUser.findOneAndUpdate(
        { email, tenantId },
        { email: newEmail },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new AppError('Whitelisted user not found', 404);
    }

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

export const deleteWhitelistedUser = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Tenant identification failed. Bearer token is required.', 401);
    }


    const user = await ImportedUser.findOneAndDelete({ email, tenantId });

    if (!user) {
        throw new AppError('Whitelisted user not found', 404);
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
