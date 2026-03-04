import { getTenantDomainModel } from '../models/TenantDomain';

export const getAllTenants = async () => {
    const TenantDomainModel = await getTenantDomainModel();
    const tenants = await TenantDomainModel.find({});
    return tenants;
};

export const getTenantByDomain = async (domain: string) => {
    const TenantDomainModel = await getTenantDomainModel();
    const tenant = await TenantDomainModel.findOne({ domain }).select('branding botName botEmail -_id');
    return tenant;
};

export const getTenantById = async (tenantId: string) => {
    const TenantDomainModel = await getTenantDomainModel();
    const tenant = await TenantDomainModel.findOne({ tenantId }).select('-botPassword');
    return tenant;
};

export default {
    getAllTenants,
    getTenantByDomain,
    getTenantById,
};
