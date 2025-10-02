import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/blueprint-xyz',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/blueprint-xyz-test'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-jwt-secret-change-in-production',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d'
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) // 100 requests per windowMs
  },
  
  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  
  // Email Configuration
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// Validate required environment variables
export const validateConfig = (): void => {
  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Using fallback values for development. Set proper values in production!');
    }
  }
};