import { Schema, Model } from 'mongoose';
import { connectionManager } from '@cuvera/commons';

export interface ITenantDomain {
    domain: string;
    tenantId: string;
}

export const tenantDomainSchema = new Schema<ITenantDomain>(
    {
        domain: {
            type: String,
            required: [true, 'Domain is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        tenantId: {
            type: String,
            required: [true, 'Tenant ID is required'],
        },
    },
    {
        timestamps: true,
    }
);

export async function getTenantDomainModel(): Promise<Model<ITenantDomain>> {
    const connection = await connectionManager.getConnection('shared');
    return (connection.models.TenantDomain as Model<ITenantDomain>) ||
        connection.model<ITenantDomain>('tenant_domain', tenantDomainSchema);
}
