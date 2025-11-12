import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectDB from './config/database';
import passport from './config/passport';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import { globalErrorHandler } from './middlewares/errorHandler';
import { setupSwagger } from './config/swagger';
import { AppError } from './utils/appError';
import { producer } from './messaging/producers/producer';
// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration for local development
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173', // Vite default
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://accounts.google.com/',
    'http://localhost:5173/',
    'https://demo.cuvera.ai',
    'https://bull.cuvera.ai/'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration for OAuth
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

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

// Base/Context routes
const baseRouter = express.Router();

// Health check route
baseRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
  });
});

baseRouter.use('/api/v1/auth', authRoutes);
baseRouter.use('/api/v1/users', userRoutes);

app.use('/auth-service', baseRouter);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

// Start server
const server = app.listen(PORT, async () => {
  try {
    await producer.initialize();
    console.log(` Server running on port ${PORT}`);
    console.log(` API Documentation available at http://localhost:${PORT}/api-docs`);
    console.log(` Health check available at http://localhost:${PORT}/cuvera-core-service/health`);

    // 🟢 Start cron scheduler (jobs run only if SCHEDULER_ENABLED=true)
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
});

process.on('unhandledRejection', async (err: Error) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err);
  try {
    await close();
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
  server.close(() => {
    process.exit(1);
  });
});


export default app;