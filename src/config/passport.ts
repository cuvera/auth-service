import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as SamlStrategy } from 'passport-saml';
import User from '../models/User';
import { IJwtPayload } from '../interfaces';
import fs from 'fs';
import path from 'path';

// Serialize user for session
passport.serializeUser((user: any, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// Type declaration to fix SAML strategy compatibility
declare module 'passport' {
    interface AuthenticateOptions {
        samlLogoutRequest?: any;
    }
}

// JWT Strategy for protected routes
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

passport.use(
    new JwtStrategy(
        {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: jwtSecret,
        },
        async (payload: IJwtPayload, done) => {
            try {
                const user = await User.findById(payload.id);

                if (!user) {
                    return done(null, false);
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    if (!email) {
                        return done(new Error('No email found in Google profile'));
                    }

                    // Check if the email domain matches the allowed domain
                    const allowedDomain = process.env.GOOGLE_DOMAIN_NAME;
                    if (allowedDomain) {
                        const emailDomain = email.split('@')[1];
                        if (emailDomain !== allowedDomain) {
                            return done(null, false, { message: `Only ${allowedDomain} email addresses are allowed.` });
                        }
                    }

                    // Check if user already exists with this Google ID
                    let user = await User.findOne({ googleId: profile.id });
                    if (user) {
                        return done(null, user);
                    }

                    // Check if user exists with the same email
                    user = await User.findOne({ email });

                    if (user) {
                        // Link Google account to existing user
                        user.googleId = profile.id;
                        await user.save();
                        return done(null, user);
                    }

                    // Create new user
                    user = new User({
                        googleId: profile.id,
                        name: profile.displayName,
                        email: email,
                        avatar: profile.photos?.[0]?.value,
                        provider: 'google',
                        // Generate a random password for OAuth users
                        password: Math.random().toString(36).slice(-8),
                    });

                    await user.save();
                    return done(null, user);
                } catch (error) {
                    return done(error);
                }
            }
        )
    );
}

// SAML Strategy
if (process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER) {
    let idpCert: string | undefined;
    let canCreateSamlStrategy = false;

    try {
        // Try to read the certificate file
        const certPath = path.resolve(process.cwd(), 'src', 'certs', 'MySAMLApp.pem');
        if (fs.existsSync(certPath)) {
            idpCert = fs.readFileSync(certPath, 'utf-8');
            canCreateSamlStrategy = true;
        } else {
            // Use a placeholder or skip SAML configuration
            console.warn('SAML authentication will not be available due to missing certificate');
        }
    } catch (error) {
        console.warn('SAML authentication will not be available due to certificate error');
    }

    // Only create SAML strategy if we have a valid certificate
    if (canCreateSamlStrategy && idpCert) {
        const samlConfig: any = {
            entryPoint: process.env.SAML_ENTRY_POINT,
            issuer: process.env.SAML_ISSUER,
            cert: idpCert,
            signatureAlgorithm: 'sha256',
            callbackUrl: process.env.SAML_CALLBACK_URL || `${process.env.BASE_URL}/api/v1/auth/saml/callback`,
            validateInResponseTo: false,
            requestIdExpirationPeriodMs: 28800000, // 8 hours
            acceptedClockSkewMs: 300000, // 5 minutes
            disableRequestedAuthnContext: true,
            forceAuthn: false,
            passive: false,
            skipRequestCompression: false,
            authnRequestBinding: 'HTTP-Redirect',
            // Explicitly disable logout handling
            logoutUrl: null,
            logoutCallbackUrl: null,
            // Additional options to prevent logout request processing
            wantAssertionsSigned: false,
            wantAuthnResponseSigned: false,
            // Protocol binding for authentication requests
            protocolBinding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
        };

        // Add optional properties only if they exist


        passport.use(
            'saml',
            new (SamlStrategy as any)(
                samlConfig,
                async (samlProfile: any, done: any) => {
                    try {
                        const name = samlProfile['http://schemas.microsoft.com/identity/claims/displayname'] ||
                            samlProfile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
                            samlProfile.nameID;
                        const email = samlProfile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
                            samlProfile.email;

                        let role = samlProfile['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                            samlProfile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'];

                        if (!role && samlProfile.attributes) {
                            const attrs = samlProfile.attributes as Record<string, unknown>;
                            role = attrs['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                                attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'];
                        }

                        // Check if user already exists with this SAML ID
                        const existingUser = await User.findOne({ email});
                        if (existingUser) {
                            return done(null, existingUser);
                        }

                        // Check if user exists with the same email
                        const userByEmail = await User.findOne({ email });

                        if (userByEmail) {
                            // Link SAML account to existing user
                            userByEmail.samlId = samlProfile.nameID;
                            await userByEmail.save();
                            return done(null, userByEmail);
                        }

                        // Create new user
                        const newUser = new User({
                            samlId: samlProfile.nameID,
                            name,
                            email,
                            provider: 'saml',
                            // Generate a random password for SAML users
                            password: Math.random().toString(36).slice(-8),
                        });

                        await newUser.save();
                        return done(null, newUser);
                    } catch (error) {
                        return done(error);
                    }
                }
            )
        );
    }
}

export default passport;
