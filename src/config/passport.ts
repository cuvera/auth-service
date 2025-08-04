import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as SamlStrategy } from 'passport-saml';
import User from '../models/User';
import { IJwtPayload } from '../interfaces';

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
                callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user already exists with this Google ID
                    let user = await User.findOne({ googleId: profile.id });

                    if (user) {
                        return done(null, user);
                    }

                    // Check if user exists with the same email
                    user = await User.findOne({ email: profile.emails?.[0]?.value });

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
                        email: profile.emails?.[0]?.value,
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
if (process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER && process.env.SAML_CERT) {
    const samlConfig: any = {
        entryPoint: process.env.SAML_ENTRY_POINT,
        issuer: process.env.SAML_ISSUER,
        callbackUrl: process.env.SAML_CALLBACK_URL || '/api/v1/auth/saml/callback',
        cert: process.env.SAML_CERT,
        // Additional SAML configuration
        identifierFormat: null,
        validateInResponseTo: false,
        disableRequestedAuthnContext: true,
    };

    // Add optional properties only if they exist
    if (process.env.SAML_PRIVATE_KEY) {
        samlConfig.decryptionPvk = process.env.SAML_PRIVATE_KEY;
        samlConfig.privateCert = process.env.SAML_PRIVATE_KEY;
    }

    passport.use(
        'saml',
        new (SamlStrategy as any)(
            samlConfig,
            async (samlProfile: any, done: any) => {
                try {
                    const email = samlProfile.email || samlProfile.nameID;
                    const name = samlProfile.displayName || samlProfile.name || email;

                    // Check if user already exists with this SAML ID
                    const existingUser = await User.findOne({ samlId: samlProfile.nameID });

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

export default passport;
