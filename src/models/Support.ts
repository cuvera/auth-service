import mongoose, { Schema } from 'mongoose';
import { IWhitelistedUser, ISupportUser } from '../interfaces/support.interface';

// WhitelistedUser Model
const whitelistedUserSchema = new Schema<IWhitelistedUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
        },
        tenantId: {
            type: String,
            required: [true, 'Tenant ID is required'],
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'importedusers',
    }
);

whitelistedUserSchema.index({ email: 1, tenantId: 1 }, { unique: true });

export const WhitelistedUser = mongoose.model<IWhitelistedUser>('WhitelistedUser', whitelistedUserSchema);

// SupportUser Model (Points to 'users' collection with all fields)
const supportUserSchema = new Schema<ISupportUser>(
    {
        name: String,
        email: String,
        password: { type: String, select: false },
        tenantId: String,
        roles: [String],
        department: String,
        employeeId: String,
        designation: String,
        avatar: String,
        googleId: String,
        provider: String,
    },
    {
        timestamps: true,
        collection: 'users',
    }
);

export const SupportUser = mongoose.model<ISupportUser>('SupportUser', supportUserSchema);
