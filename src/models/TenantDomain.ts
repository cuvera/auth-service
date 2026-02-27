import { Schema, Model } from 'mongoose';
import { connectionManager } from '@cuvera/commons';

export interface ITenantDomain {
    domain: string;
    tenantId: string;
    botEmail: string;
    botPassword: string;
    logo: string;
    favicon: string;
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
        botEmail: {
            type: String,
            required: [true, 'Bot email is required'],
        },
        botPassword: {
            type: String,
            required: [true, 'Bot password is required'],
        },
        logo: {
            type: String,
        },
        favicon: {
            type: String,
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
