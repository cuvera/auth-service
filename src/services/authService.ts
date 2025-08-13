import User from '../models/User';
import { AppError } from '../utils/appError';
import { createTokens, verifyRefreshToken } from '../utils/jwt';
import { IUser, IRegisterRequest, ILoginRequest, ITokens } from '../interfaces';

export class AuthService {
    async register(userData: IRegisterRequest): Promise<{ user: IUser; tokens: ITokens }> {
        const { name, email, password, confirmPassword } = userData;

        // Check if passwords match
        if (password !== confirmPassword) {
            throw new AppError('Passwords do not match', 400);
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('User with this email already exists', 400);
        }

        // Create new user
        const user = new User({ name, email, password });
        await user.save();

        // Generate tokens
        const tokens = createTokens({
            id: user._id.toString(),
            email: user.email,
            name: user.name, 
            tenantId: user.tenantId
        });

        return { user, tokens };
    }

    async login(loginData: ILoginRequest): Promise<{ user: IUser; tokens: ITokens }> {
        const { email, password } = loginData;

        // Check if user exists and password is correct
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            throw new AppError('Invalid email or password', 401);
        }

        // Generate tokens
        const tokens = createTokens({
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            tenantId: user.tenantId

        });

        return { user, tokens };
    }

    async refreshToken(refreshToken: string): Promise<ITokens> {
        try {
            // Verify refresh token
            const decoded = verifyRefreshToken(refreshToken);

            // Check if user still exists
            const user = await User.findById(decoded.id);
            if (!user) {
                throw new AppError('The user belonging to this token does no longer exist', 401);
            }

            // Generate new tokens
            const tokens = createTokens({
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                tenantId: user.tenantId

            });

            return tokens;
        } catch (error) {
            throw new AppError('Invalid refresh token', 401);
        }
    }

    async getUserById(id: string): Promise<IUser | null> {
        return User.findById(id).select('-password');
    }
}

export default new AuthService();
