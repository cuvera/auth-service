import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { AppError } from '../utils/appError';
import { verifyToken } from '../utils/jwt';
import { IUser } from '../interfaces';
import User from '../models/User';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface User extends IUser { }
    }
}

// Middleware to protect routes - requires valid JWT token
export const protect = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: IUser) => {
        if (err) {
            return next(new AppError('Authentication error', 401));
        }

        if (!user) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }

        req.user = user;
        next();
    })(req, res, next);
};

// Middleware to optional protect routes - populates req.user if valid JWT token is present
export const optionalProtect = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: IUser) => {
        if (user) {
            req.user = user;
        }
        next();
    })(req, res, next);
};


// Alternative protect middleware using manual JWT verification
export const protectManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1) Getting token and check if it's there
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }

        // 2) Verification token
        const decoded = verifyToken(token);

        // 3) Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return next(new AppError('The user belonging to this token does no longer exist.', 401));
        }

        // Grant access to protected route
        req.user = currentUser;
        next();
    } catch (error) {
        return next(new AppError('Invalid token. Please log in again!', 401));
    }
};

// Middleware to restrict access to certain roles
export const restrictTo = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }

        if (!req.user.roles || req.user.roles.length === 0) {
            return next(new AppError('You do not have permission to perform this action.', 403));
        }

        const hasRequiredRole = roles.some(role => req.user!.roles.includes(role));

        if (!hasRequiredRole) {
            return next(new AppError('You do not have permission to perform this action.', 403));
        }

        next();
    };
};
