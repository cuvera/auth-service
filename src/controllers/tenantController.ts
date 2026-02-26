import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import tenantService from '../services/tenantService';

export const getAllTenants = catchAsync(async (req: Request, res: Response) => {
    const tenants = await tenantService.getAllTenants();

    res.status(200).json({
        status: 'success',
        results: tenants.length,
        data: {
            tenants,
        },
    });
});
