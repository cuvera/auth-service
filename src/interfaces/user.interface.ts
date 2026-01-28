import { Document, Types } from 'mongoose';

export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    password: string;
    samlId?: string;
    avatar?: string;
    provider: 'local' | 'google' | 'saml';
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    tenantId: string;
    roles: string[];
    employeeId?: string;
    department?: string;
    designation?: string;
    google?: {
        googleId?: string;
        googleRefreshToken?: string;
        googleScopes?: string[];
        googleCalendarConnected?: boolean;
        googleCalendarConnectedAt?: Date;
    };
}

export interface ICreateUserRequest {
    name: string;
    email: string;
    password: string;
}

export interface IUserResponse {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt?: Date;
    employeeId?: string;
}

export interface IUserWithRolesResponse {
    id: string;
    name: string;
    email: string;
    roles: string[];
    createdAt: Date;
    updatedAt?: Date;
    department?: string;
    designation?: string;
}

export interface IUpdateUserRequest {
    name?: string;
    email?: string;
    password?: string;
}

export interface IBulkFetchUsersRequest {
    emailIds: string[];
}
