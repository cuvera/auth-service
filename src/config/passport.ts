import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as SamlStrategy } from 'passport-saml';
import axios from 'axios';
import { getUserModel } from '../models/User';
import { IJwtPayload } from '../interfaces';
import { setContext } from '@cuvera/commons';
import fs from 'fs';
import path from 'path';
import { MessageService } from '../services/message';
import { getImportedUserModel } from '../models/ImportedUser';
import { resolveTenantFromUrl } from '../utils/resolveTenant';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Fetches employee ID from the ingestion service
 * @param {string} email - Employee email address
 * @returns {Promise<string | null>} Employee ID or null if not found
 */
async function fetchEmployeeDetails(email: string): Promise<string | null> {
    try {
        const response = await axios.get(
            `${process.env.INGESTION_SERVICE_URL}/cuvera-ingestion-service/api/v1/employees/email/${email}`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        return response.data || null;
    } catch (error: any) {
        console.warn('Failed to fetch employee ID:', error.message);
        return null;
    }
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
    try {
        const userModel = await getUserModel();
        const user = await userModel.findById(id);

        if (user) {
            await setContext({ tenantId: user.tenantId }, async () => { });
            return done(null, user);
        }
        return done(null, false);
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
                await setContext({ tenantId: payload.tenantId }, async () => {
                    const userModel = await getUserModel();
                    const user = await userModel.findById(payload.id);

                    if (!user) {
                        return done(null, false);
                    }

                    return done(null, user);
                });
            } catch (error) {
                return done(error);
            }
        }
    )
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Remove any existing 'google' strategy to prevent duplicate strategy error
    try {
        // @ts-ignore - Accessing internal _strategy property
        if (passport._strategy && passport._strategy('google')) {
            passport.unuse('google');
        }
    } catch (error) {
        console.log('No existing Google strategy to remove or error removing it:', error);
    }

    // Define the Google strategy
    const googleStrategy = new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            passReqToCallback: true, // This allows us to access the request object
        },
        async (req: any, accessToken: string, refreshToken: string, profile: any, done: Function) => {
            // Decode state before setContext — we need originalUrl to resolve the tenant
            let requestData: any = {};
            if (req.query.state) {
                try {
                    const decodedState = Buffer.from(req.query.state, 'base64').toString('utf-8');
                    requestData = JSON.parse(decodedState);
                } catch (error) {
                    console.error('Error parsing state data:', error);
                }
            }
            console.log("requestData", requestData)

            // Resolve tenantId from the original URL's domain
            const tenantId = await resolveTenantFromUrl(requestData.originalState || requestData.originalUrl || req.originalUrl || req?.query?.state);

            await setContext({ tenantId }, async () => {
                try {
                    const email = profile.emails?.[0]?.value;
                    if (!email) {
                        throw new Error('No email found in Google profile');
                    }
                    // const isCalendarFlow = req.query.calendar === 'true';
                    const isCalendarFlow = true;

                    // Validate email access
                    const isAuthorized = await validateEmailAccess(email, tenantId);
                    if (!isAuthorized.allowed) {
                        await sendAuthLog({
                            email,
                            provider: 'google',
                            name: profile.displayName,
                            tenantId,
                            eventType: 'sign-in',
                            errorType: 'access-denied',
                            errorMessage: isAuthorized.message,
                            status: 'FAILED',
                            ipAddress: requestData.ip || req.ip,
                            userAgent: requestData.userAgent || req.headers['user-agent'],
                            endpoint: requestData.originalUrl || req.originalUrl,
                            httpMethod: req.method
                        });
                        return done(null, false, { message: isAuthorized.message });
                    }

                    // Find or create user
                    const { user, isNewUser } = await findOrCreateUser(profile, email, refreshToken, isCalendarFlow, tenantId);
                    if (isNewUser) {
                        await MessageService.sendUserData({
                            userId: user._id,
                            userEmail: user.email,
                            google: user.google
                        });
                    }
                    // Log successful authentication
                    await sendAuthLog({
                        email: user.email,
                        provider: 'google',
                        name: user.name,
                        userId: user._id,
                        tenantId,
                        eventType: isNewUser ? 'sign-up' : 'sign-in',
                        status: 'SUCCESS',
                        ipAddress: requestData.ip || req.ip,
                        userAgent: requestData.userAgent || req.headers['user-agent'],
                        endpoint: requestData.originalUrl || req.originalUrl,
                        httpMethod: req.method,
                        description: isNewUser ? 'New user registration via Google' : 'User login via Google'
                    });

                    return done(null, user);

                } catch (error) {
                    console.error('Google authentication error:', error);

                    // Log the error
                    await sendAuthLog({
                        email: profile.emails?.[0]?.value || 'unknown',
                        provider: 'google',
                        name: profile.displayName || 'Unknown',
                        tenantId,
                        eventType: 'sign-in',
                        errorType: 'authentication-error',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        status: 'FAILED',
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent'],
                        endpoint: req.originalUrl,
                        httpMethod: req.method
                    });

                    return done(error);
                }
            });
        }
    );

    // Register the strategy with Passport
    passport.use('google', googleStrategy);
}

async function sendAuthLog(payload: any): Promise<void> {
    try {
        let data = {
            userId: payload.userId,
            username: payload.name,
            userEmail: payload.email,
            action: payload.eventType === 'sign-in' ? 'LOGIN' : 'REGISTER',
            status: payload.status,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
            deviceInfo: payload.deviceInfo,
            location: payload.location,
            description: payload.description,
            changes: payload.changes,
            errorMessage: payload.errorMessage,
            errorCode: payload.errorCode,
            endpoint: payload.endpoint,
            httpMethod: payload.httpMethod,
            metadata: payload.metadata,
            tenantId: payload.tenantId,
            serviceName: process.env.SERVICE_NAME || 'auth-service'

        }

        await MessageService.sendAuthLogsMessage(data);
    } catch (error) {
        console.error('Failed to send auth log:', {
            payload,
            error: error instanceof Error ? error.message : error
        });
    }
}

async function validateEmailAccess(email: string, tenantId: string): Promise<{ allowed: boolean; message?: string }> {
    console.log("email", email)
    console.log("tenantId", tenantId)
    try {
        const allowedDomain = process.env.GOOGLE_DOMAIN_NAME;

        const importedUserModel = await getImportedUserModel();
        const importedUser = await importedUserModel.findOne({
            email: email.toLowerCase(),
            tenantId
        });
        console.log("importedUser", importedUser)
        const emailDomain = email.split('@')[1];
        const isDomainAllowed = allowedDomain && emailDomain === allowedDomain;
        const isEmailAllowed = !!importedUser;

        if (isDomainAllowed || isEmailAllowed) {
            return { allowed: true };
        }
        console.log("isDomainAllowed", isDomainAllowed)
        console.log("isEmailAllowed", isEmailAllowed)
        const errorMessage = allowedDomain
            ? `Sorry! You are not part of the organization. Please contact your administrator to get access.`
            : 'Sorry!! Your email is not in the allowed list.';

        return { allowed: false, message: errorMessage };
    } catch (error) {
        console.error('Email validation error:', error);
        return {
            allowed: false,
            message: 'Authentication service configuration error'
        };
    }
}

// Helper function: Find or create user
async function findOrCreateUser(
    profile: any,
    email: string,
    refreshToken?: string,
    isCalendarFlow?: boolean,
    tenantId?: string
): Promise<{ user: any; isNewUser: boolean }> {
    let user;
    let isNewUser = false;

    // Check if user exists with Google ID
    const userModel = await getUserModel();
    user = await userModel.findOne({ 'google.googleId': profile.id });

    if (!user) {
        user = await userModel.findOne({ email });
        if (user) {
            user.google = user.google || {};
            user.google.googleId = profile.id;
        } else {
            isNewUser = true;

            // Fetch employee details for new user
            const employeeDetails: any = await fetchEmployeeDetails(email);

            user = new userModel({
                google: {
                    googleId: profile.id
                },
                name: profile.displayName,
                email,
                avatar: profile.photos?.[0]?.value,
                provider: 'google',
                employeeId: employeeDetails?.data?.employeeId,
                password: Math.random().toString(36).slice(-8),
                tenantId: tenantId,
                department: employeeDetails?.data?.department,
                designation: employeeDetails?.data?.designation
            });
        }
    }

    // Handle Calendar Flow updates (for existing or new users)
    if (isCalendarFlow && refreshToken) {
        user.google = user.google || {};
        user.google.googleRefreshToken = refreshToken;
        user.google.googleScopes = [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events'
        ];
        user.google.googleCalendarConnected = true;
        user.google.googleCalendarConnectedAt = new Date();
    }
    await user.save();

    return { user, isNewUser };
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
                    await setContext({ tenantId: process.env.TENANT_ID || 'default' }, async () => {
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

                            const userModel = await getUserModel();
                            // Check if user already exists with this SAML ID
                            const existingUser = await userModel.findOne({ email });
                            if (existingUser) {
                                return done(null, existingUser);
                            }

                            // Check if user exists with the same email
                            const userByEmail = await userModel.findOne({ email });

                            if (userByEmail) {
                                // Link SAML account to existing user
                                userByEmail.samlId = samlProfile.nameID;
                                await userByEmail.save();
                                return done(null, userByEmail);
                            }

                            // Create new user
                            const newUser = new userModel({
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
                    });
                }
            )
        );
    }
}

export default passport;
