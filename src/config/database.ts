import mongoose from 'mongoose';

const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MongoDB connection string not found in environment variables');
    }

    const connection = await mongoose.connect(mongoUri, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority'
    });

    console.log(`✅ MongoDB Connected: ${connection.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('📴 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during MongoDB connection closing:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDatabase;