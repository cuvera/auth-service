import { Document, Types } from 'mongoose';

export interface IWhitelistedUser extends Document {
    _id: Types.ObjectId;
    email: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IWhitelistingRequest {
    users: { email: string }[] | { email: string };
}

export interface ISupportUser extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    tenantId: string;
    roles: string[];
    department?: string;
    employeeId?: string;
    designation?: string;
    createdAt: Date;
    updatedAt: Date;
    avatar?: string;
    googleId?: string;
    provider?: string;
}

export interface ISupportUserUpdateRequest {
    name?: string;
    email?: string;
    department?: string;
    employeeId?: string;
    designation?: string;
    roles?: string[];
}
