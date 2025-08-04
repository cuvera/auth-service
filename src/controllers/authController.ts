import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import authService from '../services/authService';
import passportAuthService from '../services/passportAuthService';
import { IRegisterRequest, ILoginRequest, IRefreshTokenRequest, IApiResponse, IAuthResponse } from '../interfaces';

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

    // Also check for refresh token in cookies
    const tokenFromCookie = req.cookies?.refreshToken;
    const token = refreshToken || tokenFromCookie;

    if (!token) {
        throw new AppError('Please provide refresh token', 400);
    }

    const tokens = await authService.refreshToken(token);

    const response: IApiResponse<{ tokens: typeof tokens }> = {
        status: 'success',
        data: { tokens },
    };

    res.status(200).json(response);
});

export const logout = catchAsync(async (req: Request, res: Response) => {
    res.cookie('refreshToken', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    const response: IApiResponse<null> = {
        status: 'success',
        message: 'Logged out successfully',
    };

    res.status(200).json(response);
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
    return passportAuthService.authenticateGoogle()(req, res, next);
});

export const googleCallback = catchAsync(async (req: Request, res: Response, next: Function) => {
    passportAuthService.authenticateGoogleCallback()(req, res, (err: any) => {
        if (err) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
        }

        if (!req.user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
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
        const frontendUrl = process.env.FRONTEND_URL;
        res.redirect(`${frontendUrl}/auth/success?token=${tokens.accessToken}`);
    });
});

// SAML Routes
export const samlAuth = catchAsync(async (req: Request, res: Response, next: Function) => {
    return passportAuthService.authenticateSaml()(req, res, next);
});

export const samlCallback = catchAsync(async (req: Request, res: Response, next: Function) => {
    passportAuthService.authenticateSamlCallback()(req, res, (err: any) => {
        if (err) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=saml_auth_failed`);
        }

        if (!req.user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=saml_auth_failed`);
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
        const frontendUrl = process.env.FRONTEND_URL;
        res.redirect(`${frontendUrl}/auth/success?token=${tokens.accessToken}`);
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
