import jwt from 'jsonwebtoken';
import { IJwtPayload } from '../interfaces';
import { AppError } from './appError';

export const signToken = (payload: IJwtPayload): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new AppError('JWT_SECRET is not defined in environment variables', 500);
    }

    // Use explicit typing to avoid TypeScript issues
    return jwt.sign(
        payload as object,
        secret as jwt.Secret,
        { expiresIn: '30d' }
    );
};

export const signRefreshToken = (payload: IJwtPayload): string => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new AppError('JWT_REFRESH_SECRET is not defined in environment variables', 500);
    }

    // Use explicit typing to avoid TypeScript issues
    return jwt.sign(
        payload as object,
        secret as jwt.Secret,
        { expiresIn: '30d' }
    );
};

export const verifyToken = (token: string): IJwtPayload => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new AppError('JWT_SECRET is not defined in environment variables', 500);
    }

    try {
        return jwt.verify(token, secret as jwt.Secret) as IJwtPayload;
    } catch (error) {
        throw new AppError('Invalid or expired token', 401);
    }
};

export const verifyRefreshToken = (token: string): IJwtPayload => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new AppError('JWT_REFRESH_SECRET is not defined in environment variables', 500);
    }

    try {
        return jwt.verify(token, secret as jwt.Secret) as IJwtPayload;
    } catch (error) {
        throw new AppError('Invalid or expired refresh token', 401);
    }
};

export const createTokens = (user: {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    roles: string[];
    employeeId?: string;
    department?: string;
    designation?: string;
}): { accessToken: string; refreshToken: string } => {
    const payload: IJwtPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        roles: user.roles,
        employeeId: user?.employeeId,
        department: user?.department,
        designation: user?.designation

    };

    const accessToken = signToken(payload);
    const refreshToken = signRefreshToken(payload);

    return { accessToken, refreshToken };
};
