import { Request, Response } from 'express';
import passport from 'passport';
import { createTokens } from '../utils/jwt';
import { AppError } from '../utils/appError';
import { IUser, ITokens } from '../interfaces';

export class PassportAuthService {
    // Google OAuth authentication wrapper
    authenticateGoogle() {
        return passport.authenticate('google', {
            scope: ['profile', 'email'],
        });
    }

    // Google OAuth callback wrapper
    authenticateGoogleCallback() {
        return passport.authenticate('google', {
            session: false,
            failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
        });
    }

    // SAML authentication wrapper
    authenticateSaml() {
        return passport.authenticate('saml', {
            session: false,
        });
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
        });

        return { user, tokens };
    }

    // Check if Google OAuth is configured
    isGoogleConfigured(): boolean {
        return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    }

    // Check if SAML is configured
    isSamlConfigured(): boolean {
        return !!(process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER);
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
