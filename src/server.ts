import express from 'express';
import { createServer } from 'http';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import { config, validateConfig } from './config';
import connectDatabase from './config/database';
import { globalErrorHandler, handleNotFound } from './middleware/errorHandler';
import { initializeSocketServer } from './socket/socketServer';

// Load Swagger YAML file
const swaggerDocument = YAML.load(path.resolve(__dirname, '../swagger.yaml'));

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import studioRoutes from './routes/studioRoutes';
import jobRoutes from './routes/jobRoutes';
import postRoutes from './routes/postRoutes';
import { reelRoutes, messageRoutes, notificationRoutes, savedRoutes, feedRoutes, trendingRoutes } from './routes/index';

// Validate environment configuration
validateConfig();

// Create Express app and HTTP server
const app = express();
const httpServer = createServer(app);

// Trust proxy (important for production behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// CORS configuration
const allowedOrigins = [config.cors.origin, 'http://localhost:3000', "https://blueprint-xyz.vercel.app"];
const corsOptions = {
  origin: allowedOrigins,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/trending', trendingRoutes);

// Swagger UI for API documentation
app.use('/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Handle unhandled routes
app.all('*', handleNotFound);

// Global error handling middleware
app.use(globalErrorHandler);

// Graceful shutdown handling
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Rejection! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Initialize Socket.IO server
    const socketServer = initializeSocketServer(httpServer);
    console.log('✅ Socket.IO server initialized');
    
    // Start listening for requests
    const server = httpServer.listen(config.port, () => {
      console.log(`🚀 Blueprint-XYZ API Server running on port ${config.port}`);
      console.log(`📱 Environment: ${config.nodeEnv}`);
      console.log(`🌐 CORS Origin: ${config.cors.origin}`);
      console.log(`💬 Socket.IO server ready for real-time messaging`);
      if (config.nodeEnv === 'development') {
        console.log(`📋 Health check: http://localhost:${config.port}/health`);
        console.log(`🔐 Auth endpoints: http://localhost:${config.port}/api/auth`);
        console.log(`🔐 Documentation: http://localhost:${config.port}/documentation`);
        console.log(`💬 Socket.IO: ws://localhost:${config.port}`);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📴 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('🛑 Process terminated');
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;