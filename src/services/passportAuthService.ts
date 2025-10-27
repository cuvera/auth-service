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
        // Create a state object with the request data we need
        const stateData = {
            originalUrl: req.originalUrl,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            // Add any other request data you need
            ...(req.query.state ? { originalState: req.query.state } : {})
        };

        const options: any = {
            scope: ['profile', 'email'],
            // Encode the state as a URL-safe string
            state: Buffer.from(JSON.stringify(stateData)).toString('base64')
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
                if (err) {
                    return res.status(401).json({
                        status: 'error',
                        message: 'Google authentication failed',
                        details: err.message || 'Unknown error occurred'
                    });
                }
                if (!user) {
                    return res.status(401).json({
                        status: 'error',
                        message: 'Google authentication failed',
                        details: info?.message || 'Authentication failed'
                    });
                }
                req.user = user;
                next();
            })(req, res, next);
        };
    }

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
