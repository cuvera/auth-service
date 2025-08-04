import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './config/database';
import passport from './config/passport';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import { globalErrorHandler } from './middlewares/errorHandler';
import { setupSwagger } from './config/swagger';
import { AppError } from './utils/appError';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Setup Swagger documentation
setupSwagger(app);

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running!',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Handle undefined routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation available at ${process.env.BASE_URL}/api-docs`);
    console.log(`🏥 Health check available at ${process.env.BASE_URL}/health`);
});

export default app;
