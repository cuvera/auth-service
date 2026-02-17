import { NextFunction, Request, Response } from 'express';
import passport from '../config/passport';
import { createTokens } from '../utils/jwt';
import { AppError } from '../utils/appError';
import { IUser, ITokens } from '../interfaces';


export class PassportAuthService {

    isIOS(req: Request): boolean {
        const ua = req.headers["user-agent"] || "";
        return /iPhone|iPad|iPod/i.test(ua);
    }
    // Google OAuth authentication wrapper
    authenticateGoogle(req: Request) {
        const stateData = {
            originalUrl: req.originalUrl,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            ...(req.query.state ? { originalState: req.query.state } : {})
        };

        const scope = ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/calendar.events'];
        if (req.query.calendar === 'true') {
            scope.push('https://www.googleapis.com/auth/calendar.readonly');
        }

        // const options: any = {
        //     scope,
        //     accessType: 'offline',
        //     includeGrantedScopes: false,
        //     prompt: 'consent',
        //     state: Buffer.from(JSON.stringify(stateData)).toString('base64')
        // };
        const options: any = {
            scope: ['openid', 'profile', 'email'],
            includeGrantedScopes: false,
            state: Buffer.from(JSON.stringify(stateData)).toString('base64'),
        };

        if (this.isIOS(req)) {
            options.prompt = "select_account";
        }

        return passport.authenticate('google', options);
    }

    //Calendar connect
    authenticateGoogleCalendar(req: Request) {
        const stateData = {
            originalUrl: req.originalUrl,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            ...(req.query.state ? { originalState: req.query.state } : {})
        };

        const options = {
            scope: [
                'openid',
                'profile',
                'email',
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/calendar.events'
            ],
            accessType: 'offline',
            prompt: 'consent',
            includeGrantedScopes: false,
            state: Buffer.from(JSON.stringify(stateData)).toString('base64'),
        };
        if (this.isIOS(req)) {
            options.prompt = "select_account";
        }
        return passport.authenticate('google', options);
    }


    // Google OAuth callback wrapper
    authenticateGoogleCallback() {
        return (req: Request, res: Response, next: NextFunction) => {
            passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
                let frontendUrl = process.env.FRONTEND_URL || '';

                // Try to get frontend URL from state parameter
                if (req.query.state) {
                    try {
                        const decodedState = Buffer.from(req.query.state as string, 'base64').toString('utf-8');
                        const requestData = JSON.parse(decodedState);
                        frontendUrl = requestData?.originalState || frontendUrl;
                    } catch (e) {
                        console.error('Error parsing state in passport service:', e);
                    }
                }
                if (err) {
                    const errorMessage = encodeURIComponent(err.message || 'Unknown error occurred');
                    return res.redirect(`${frontendUrl}/login?error=google_auth_failed&message=${errorMessage}`);
                }

                if (!user) {
                    const errorMessage = encodeURIComponent(info?.message || 'Authentication failed');
                    return res.redirect(`${frontendUrl}/login?error=google_auth_failed&message=${errorMessage}`);
                }
                req.user = user;
                next();
            })(req, res, next);
        };
    }
    // authenticateGoogleCallback() {
    //     return passport.authenticate('google', {
    //         session: false,
    //         failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    //     });
    // }


    // SAML authentication wrapper
    authenticateSaml() {
        return (req: Request, res: Response, next: Function) => {
            console.log('SAML authentication initiated');
            console.log('Request method:', req.method);
            console.log('Request URL:', req.url);
            console.log('Query params:', req.query);

            try {
                passport.authenticate('saml', {
                    session: false,
                })(req, res, (err: any) => {
                    if (err) {
                        console.error('SAML authentication error:', err);
                        return res.status(500).json({
                            status: 'error',
                            message: 'SAML authentication initialization failed',
                            error: {
                                statusCode: 500,
                                status: 'error',
                                details: err.message
                            }
                        });
                    }
                    console.log('SAML authentication successful, proceeding...');
                    next();
                });
            } catch (error) {
                console.error('SAML authentication catch error:', error);
                return res.status(500).json({
                    status: 'error',
                    message: 'SAML authentication initialization failed',
                    error: {
                        statusCode: 500,
                        status: 'error'
                    }
                });
            }
        };
    }

    // SAML callback wrapper
    authenticateSamlCallback() {
        return passport.authenticate('saml', {
            session: false,
            failureRedirect: `${process.env.FRONTEND_URL}/login?error=saml_auth_failed`,
        });
    }

    // Handle successful OAuth/SAML authentication
    handleAuthSuccess(user: IUser): { user: IUser; tokens: ITokens } {
        const tokens = createTokens({
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            tenantId: user.tenantId,
            roles: user?.roles,
            employeeId: user?.employeeId,
            department: user?.department,
            designation: user?.designation
        });

        return { user, tokens };
    }

    // Check if Google OAuth is configured
    isGoogleConfigured(): boolean {
        return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    }

    // Check if SAML is configured
    isSamlConfigured(): boolean {
        try {
            // Check if required environment variables exist
            const hasRequiredEnv = !!(process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER);

            if (!hasRequiredEnv) {
                return false;
            }

            // Check if certificate file exists
            const fs = require('fs');
            const path = require('path');
            const certPath = path.resolve(process.cwd(), 'src', 'certs', 'MySAMLApp.pem');

            return fs.existsSync(certPath);
        } catch (error) {
            console.error('Error checking SAML configuration:', error);
            return false;
        }
    }

    // Get available authentication providers
    getAvailableProviders(): string[] {
        const providers: string[] = ['local']; // Always available

        if (this.isGoogleConfigured()) {
            providers.push('google');
        }

        if (this.isSamlConfigured()) {
            providers.push('saml');
        }

        return providers;
    }

    // Middleware to check if external auth is available
    requireExternalAuth(provider: string) {
        return (req: Request, res: Response, next: Function) => {
            if (provider === 'google' && !this.isGoogleConfigured()) {
                throw new AppError('Google OAuth is not configured', 400);
            }

            if (provider === 'saml' && !this.isSamlConfigured()) {
                throw new AppError('SAML authentication is not configured', 400);
            }

            next();
        };
    }
}

export default new PassportAuthService();
