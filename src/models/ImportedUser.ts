import mongoose, { Schema } from 'mongoose';
import validator from 'validator';

export interface IImportedUser {
    email: string;
    tenantId: string;
    importedAt: Date;
}

const importedUserSchema = new Schema<IImportedUser>(
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

const ImportedUser = mongoose.model<IImportedUser>('ImportedUser', importedUserSchema);

export default ImportedUser;
