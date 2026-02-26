import { getTenantDomainModel } from '../models/TenantDomain';

export const getAllTenants = async () => {
    const TenantDomainModel = await getTenantDomainModel();
    const tenants = await TenantDomainModel.find({});
    return tenants;
};

export default {
    getAllTenants,
};
