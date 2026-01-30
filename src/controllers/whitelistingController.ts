import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import ImportedUser from '../models/ImportedUser';
import { auditLogService } from '../services/auditLogService';

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

    // Check for existing emails in the whitelist
    const existingUsers = await ImportedUser.find({
        email: { $in: emails },
        tenantId
    });

    if (existingUsers.length > 0) {
        const duplicateEmails = existingUsers.map(user => user.email);
        const duplicateList = duplicateEmails.join(', ');

        throw new AppError(
            `The following email(s) are already whitelisted: ${duplicateList}`,
            400
        );
    }

    // Create new whitelisted users
    const whitelistedUsers = await ImportedUser.insertMany(
        emails.map((email: string) => ({
            email,
            tenantId,
            importedAt: new Date()
        }))
    );

    // Send audit logs for each whitelisted user
    await Promise.all(
        emails.map((email: string) =>
            auditLogService.sendAuditLog(
                auditLogService.createMessage(tenantId, process.env.MESSAGING_TOP_AUDIT_LOGS || 'dev.integration.activity.logs.v1', {
                    userId: req.user?._id?.toString() || 'unknown',
                    username: req.user?.name || 'unknown',
                    userEmail: req.user?.email || 'unknown',
                    action: 'CREATE',
                    status: 'SUCCESS',
                    description: `Whitelisted new user: ${email}`,
                    metadata: { targetEmail: email }
                })
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
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Tenant identification failed. Bearer token is required.', 401);
    }

    const { email: newEmail } = req.body;
    if (!newEmail) {
        throw new AppError('New email is required in the request body', 400);
    }

    const user = await ImportedUser.findOneAndUpdate(
        { _id: id, tenantId },
        { email: newEmail },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new AppError('Whitelisted user not found', 404);
    }

    // Send audit log for update
    await auditLogService.sendAuditLog(
        auditLogService.createMessage(tenantId, process.env.MESSAGING_TOP_AUDIT_LOGS || 'dev.integration.activity.logs.v1', {
            userId: req.user?._id?.toString() || 'unknown',
            username: req.user?.name || 'unknown',
            userEmail: req.user?.email || 'unknown',
            action: 'UPDATE',
            status: 'SUCCESS',
            description: `Updated whitelist entry for ID: ${id}`,
            changes: {
                oldValue: { id },
                newValue: { email: newEmail }
            },
            metadata: { targetId: id, targetEmail: newEmail }
        })
    );

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

export const deleteWhitelistedUser = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        throw new AppError('Tenant identification failed. Bearer token is required.', 401);
    }


    const user = await ImportedUser.findOneAndDelete({ _id: id, tenantId });

    if (!user) {
        throw new AppError('Whitelisted user not found', 404);
    }

    // Send audit log for deletion
    await auditLogService.sendAuditLog(
        auditLogService.createMessage(tenantId, process.env.MESSAGING_TOP_AUDIT_LOGS || 'dev.integration.activity.logs.v1', {
            userId: req.user?._id?.toString() || 'unknown',
            username: req.user?.name || 'unknown',
            userEmail: req.user?.email || 'unknown',
            action: 'DELETE',
            status: 'SUCCESS',
            description: `Removed user with ID: ${id} (${user.email}) from whitelist`,
            metadata: { targetId: id, targetEmail: user.email }
        })
    );

    res.status(204).json({
        status: 'success',
        data: null
    });
});
