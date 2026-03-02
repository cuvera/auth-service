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

export const getTenantByDomain = catchAsync(async (req: Request, res: Response) => {
    const domain = req.query.domain as string;
    const tenant = await tenantService.getTenantByDomain(domain);

    if (!tenant) {
        return res.status(404).json({
            status: 'fail',
            message: 'Tenant not found'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            tenant,
        },
    });
});
