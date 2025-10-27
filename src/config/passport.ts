import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as SamlStrategy } from 'passport-saml';
import axios from 'axios';
import User from '../models/User';
import { IJwtPayload } from '../interfaces';
import fs from 'fs';
import path from 'path';
import { MessageService } from '../services/message';

/**
 * Fetches employee ID from the ingestion service
 * @param {string} email - Employee email address
 * @returns {Promise<string | null>} Employee ID or null if not found
 */
async function fetchEmployeeDetails(email: string): Promise<string | null> {
    try {
        const response = await axios.get(
            `${process.env.INTEGRATION_SERVICE_URL}/cuvera-ingestion-service/api/v1/employees/email/${email}`,
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
        async (req: any, _accessToken: string, _refreshToken: string, profile: any, done: Function) => {
            console.log('Google OAuth callback received');
            
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) {
                    throw new Error('No email found in Google profile');
                }
                
                // Get state data if available
                let requestData: any = {};
                if (req.query.state) {
                    try {
                        const decodedState = Buffer.from(req.query.state, 'base64').toString('utf-8');
                        requestData = JSON.parse(decodedState);
                    } catch (error) {
                        console.error('Error parsing state data:', error);
                    }
                }
                
                // Validate email access
                const isAuthorized = validateEmailAccess(email);
                console.log("isAuthorized", isAuthorized);
                if (!isAuthorized.allowed) {
                    await sendAuthLog({
                        email,
                        provider: 'google',
                        name: profile.displayName,
                        tenantId: process.env.TENANT_ID || 'default',
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
                const { user, isNewUser } = await findOrCreateUser(profile, email);
                
                // Log successful authentication
                await sendAuthLog({
                    email: user.email,
                    provider: 'google',
                    name: user.name,
                    userId: user._id,
                    tenantId: process.env.TENANT_ID,
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
                    tenantId: process.env.TENANT_ID || 'default',
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
            errorCode : payload.errorCode,
            endpoint : payload.endpoint,
            httpMethod : payload.httpMethod,
            metadata : payload.metadata,
            tenantId: payload.tenantId

        }

        await MessageService.sendAuthLogsMessage(data);
    } catch (error) {
        console.error('Failed to send auth log:', {
            payload,
            error: error instanceof Error ? error.message : error
        });
    }
}

function validateEmailAccess(email: string): { allowed: boolean; message?: string } {
    try {
        const allowedDomain = process.env.GOOGLE_DOMAIN_NAME;
        const allowedEmails = process.env.ALLOWED_EMAILS 
            ? process.env.ALLOWED_EMAILS.split(',').map(e => e.trim()) 
            : [];
        
        const emailDomain = email.split('@')[1];
        const isDomainAllowed = allowedDomain && emailDomain === allowedDomain;
        const isEmailAllowed = allowedEmails.includes(email);

        if (isDomainAllowed || isEmailAllowed) {
            return { allowed: true };
        }

        const errorMessage = allowedDomain 
            ? `Access denied. Sorry!! You are not the part of the organization.`
            : 'Access denied. Your email is not in the allowed list.';
        
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
    email: string
): Promise<{ user: any; isNewUser: boolean }> {
    // Check if user exists with Google ID
    let user = await User.findOne({ googleId: profile.id });
    if (user) {
        return { user, isNewUser: false };
    }

    // Check if user exists with email
    user = await User.findOne({ email });
    if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        await user.save();
        return { user, isNewUser: false };
    }

    // Fetch employee details for new user
    const employeeDetails: any = await fetchEmployeeDetails(email);

    // Create new user
    user = new User({
        googleId: profile.id,
        name: profile.displayName,
        email,
        avatar: profile.photos?.[0]?.value,
        provider: 'google',
        employeeId: employeeDetails?.data?.employeeId,
        password: Math.random().toString(36).slice(-8),
        tenantId: process.env.TENANT_ID || 'default',
        department: employeeDetails?.data?.department,
        designation: employeeDetails?.data?.designation
    });

    await user.save();
    return { user, isNewUser: true };
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
