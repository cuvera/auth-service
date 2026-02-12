import { Schema, Connection, Model } from 'mongoose';
import validator from 'validator';
import { getDb } from '@cuvera/commons';

export interface IImportedUser {
    email: string;
    tenantId: string;
    importedAt: Date;
}

export const importedUserSchema = new Schema<IImportedUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            validate: [validator.isEmail, 'Please provide a valid email'],
        },
        tenantId: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

// Add index for faster queries
importedUserSchema.index({ email: 1, tenantId: 1 }, { unique: true });

export async function getImportedUserModel(connection?: Connection): Promise<Model<IImportedUser>> {
    if (!connection) {
        connection = await getDb();
    }
    return (connection.models.ImportedUser as Model<IImportedUser>) || connection.model<IImportedUser>('ImportedUser', importedUserSchema);
}
