import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import authService from '../services/authService';
import passportAuthService from '../services/passportAuthService';
import { IRegisterRequest, ILoginRequest, IRefreshTokenRequest, IApiResponse, IAuthResponse } from '../interfaces';
import jwt from 'jsonwebtoken';
import { MessageService } from '../services/message';

const createSendToken = (user: any, tokens: any, statusCode: number, res: Response) => {
    const cookieOptions = {
        expires: new Date(
            Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN!) || 7) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    };

    res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

    // Remove password from output
    user.password = undefined;

    const authResponse: IAuthResponse = {
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
        },
        tokens,
    };

    const response: IApiResponse<IAuthResponse> = {
        status: 'success',
        data: authResponse,
    };

    res.status(statusCode).json(response);
};

export const register = catchAsync(async (req: Request, res: Response) => {
    const { name, email, password, confirmPassword }: IRegisterRequest = req.body;

    if (!name || !email || !password || !confirmPassword) {
        throw new AppError('Please provide name, email, password, and confirm password', 400);
    }

    const { user, tokens } = await authService.register({
        name,
        email,
        password,
        confirmPassword,
    });

    createSendToken(user, tokens, 201, res);
});

export const login = catchAsync(async (req: Request, res: Response) => {
    const { email, password }: ILoginRequest = req.body;

    if (!email || !password) {
        throw new AppError('Please provide email and password', 400);
    }

    const { user, tokens } = await authService.login({ email, password });

    createSendToken(user, tokens, 200, res);
});

export const refreshToken = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken }: IRefreshTokenRequest = req.body;
    let data: any = {
        userId: req.user?.id,
        username: req.user?.name,
        userEmail: req.user?.email,
        action: 'LOGIN',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        httpMethod: req.method,
        metadata: {
            tenantId: process.env.TENANT_ID || req.user?.tenantId,
        },
        serviceName: process.env.SERVICE_NAME || 'auth-service'

    }
    // Also check for refresh token in cookies
    const tokenFromCookie = req.cookies?.refreshToken;
    const token = refreshToken || tokenFromCookie;

    if (!token) {
        throw new AppError('Please provide refresh token', 400);
    }
    try {
        const tokens = await authService.refreshToken(token);
        const response: IApiResponse<{ tokens: typeof tokens }> = {
            status: 'success',
            data: { tokens },
        };
        data.description = 'User refreshed token successfully';
        data.changes = 'User refreshed token successfully';
        data.status = 'success';
        res.status(200).json(response);
        await MessageService.sendAuthLogsMessage(data);
    } catch (error: any) {
        res.status(403).json({
            status: 'error',
            message: error.message || 'Error in refreshing token',
        });
        data.errorMessage = error.message;
        data.errorCode = 403;
        data.status = 'error';
        await MessageService.sendAuthLogsMessage(data);
    }
});

export const logout = catchAsync(async (req: Request, res: Response) => {
    let data: any = {
        userId: req.user?.id,
        username: req.user?.name,
        userEmail: req.user?.email,
        action: 'LOGOUT',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        httpMethod: req.method,
        metadata: {
            tenantId: process.env.TENANT_ID || req.user?.tenantId,
        },
        serviceName: process.env.SERVICE_NAME || 'auth-service'

    }
    try {
        res.cookie('refreshToken', 'loggedout', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true,
        });

        const response: IApiResponse<null> = {
            status: 'success',
            message: 'Logged out successfully',
        };
        res.status(200).json(response);
        data.description = 'User logged out successfully';
        data.changes = 'User logged out successfully';
        data.status = 'success';
        await MessageService.sendAuthLogsMessage(data);
    }
    catch (error: any) {
        res.status(500).json({
            status: 'error',
            message: 'Error logging out',
            error: {
                statusCode: 500,
                status: 'error'
            }
        });
        data.errorMessage = error.message;
        data.errorCode = 500;
        data.status = 'error';
        await MessageService.sendAuthLogsMessage(data);
    }
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;

    const response: IApiResponse<{ user: any }> = {
        status: 'success',
        data: {
            user: {
                id: user?._id.toString(),
                name: user?.name,
                email: user?.email,
                createdAt: user?.createdAt,
                updatedAt: user?.updatedAt,
            },
        },
    };

    res.status(200).json(response);
});


// Google OAuth Routes
export const googleAuth = catchAsync(async (req: Request, res: Response, next: Function) => {
    console.log("googleAuth", req.query)
    return passportAuthService.authenticateGoogle(req)(req, res, next);
});

export const googleCallback = catchAsync(async (req: Request, res: Response, next: Function) => {
    passportAuthService.authenticateGoogleCallback()(req, res, (err: any) => {
        let frontendUrl = process.env.FRONTEND_URL;
        if (req.query.state) {
            try {
                const decodedState = Buffer.from(req.query.state as string, 'base64').toString('utf-8');
                const requestData = JSON.parse(decodedState);
                frontendUrl = requestData?.originalState || process.env.FRONTEND_URL;

            } catch (e) {
                console.error('Error parsing state:', e);
            }
        }

        if (err) {
            console.log("googleCallback", err.message);
            return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
        }

        if (!req.user) {
            console.log("req.user", req.user);
            return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
        }

        const { user, tokens } = passportAuthService.handleAuthSuccess(req.user);


        // Set refresh token as HTTP-only cookie
        const cookieOptions = {
            expires: new Date(
                Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN!) || 7) * 24 * 60 * 60 * 1000
            ),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        };

        res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
        console.log("tokens", tokens)
        res.redirect(`${frontendUrl}/login?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
    });
});

// SAML Routes
export const samlAuth = catchAsync(async (req: Request, res: Response, next: Function) => {
    // Check if SAML is properly configured
    if (!passportAuthService.isSamlConfigured()) {
        return res.status(503).json({
            status: 'error',
            message: 'SAML authentication is not available. Please check server configuration.',
            error: {
                statusCode: 503,
                status: 'error'
            }
        });
    }

    return passportAuthService.authenticateSaml()(req, res, next);
});

export const samlCallback = catchAsync(async (req: Request, res: Response, next: Function) => {
    // Check if SAML is properly configured
    if (!passportAuthService.isSamlConfigured()) {
        return res.status(503).json({
            status: 'error',
            message: 'SAML authentication is not available. Please check server configuration.',
            error: {
                statusCode: 503,
                status: 'error'
            }
        });
    }

    passportAuthService.authenticateSamlCallback()(req, res, (err: any) => {
        if (err) {
            console.error('SAML callback error:', err);
            return res.redirect(`${origin}/login?error=saml_auth_failed`);
        }

        if (!req.user) {
            return res.redirect(`${origin}/login?error=saml_auth_failed`);
        }

        const { user, tokens } = passportAuthService.handleAuthSuccess(req.user);

        // Set refresh token as HTTP-only cookie
        const cookieOptions = {
            expires: new Date(
                Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN!) || 7) * 24 * 60 * 60 * 1000
            ),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        };

        res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

        // Redirect to frontend with access token
        res.redirect(`${origin}/auth/success?token=${tokens.accessToken}`);
    });
});

// Get available authentication providers
export const getAuthProviders = catchAsync(async (req: Request, res: Response) => {
    const providers = passportAuthService.getAvailableProviders();

    const response: IApiResponse<{ providers: string[] }> = {
        status: 'success',
        data: { providers },
    };

    res.status(200).json(response);
});

// Take bearer token from header and return userId
export const authorize = catchAsync(async (req: Request, res: Response) => {
    try {

        // Extract JWT token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid token' });
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT token
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);


        // Set user info in response headers for Nginx
        res.set({
            'user-id': decoded.id,
            'tenant-id': decoded.tenantId,
            'roles': Array.isArray(decoded.roles) ? decoded.roles.join(',') : decoded.roles,
            'email': decoded.email,
            'name': decoded.name,
            'username': decoded.username,
            'employee-id': decoded.employeeId,
            'department': decoded.department,
            'designation': decoded.designation,
        });

        // Return 200 OK with empty body
        res.status(200).send('');

    } catch (error: any) {
        console.error('Auth error:', error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Internal server error
        res.status(500).json({ error: 'Authentication service error' });
    }
});
