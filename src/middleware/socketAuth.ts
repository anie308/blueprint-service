import { Socket } from 'socket.io';
import { User } from '../models';
import { verifyToken } from '../utils/jwt';
import { SocketData } from '../types/socket';

// Extended Socket with typed data
export interface AuthenticatedSocket extends Socket {
  data: SocketData;
}

// Socket authentication middleware
export const authenticateSocket = async (socket: AuthenticatedSocket, next: (err?: any) => void) => {
  try {
    // Get token from socket handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token as string;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify the JWT token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user data to socket
    socket.data.user = user;
    socket.data.userId = user._id;

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    next(new Error(errorMessage));
  }
};

// Manual authentication for socket events
export const authenticateSocketEvent = async (socket: AuthenticatedSocket, token: string): Promise<boolean> => {
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return false;
    }

    socket.data.user = user;
    socket.data.userId = user._id;

    return true;
  } catch (error) {
    return false;
  }
};

// Middleware to ensure socket is authenticated for specific events
export const requireSocketAuth = (socket: AuthenticatedSocket): boolean => {
  return !!(socket.data.user && socket.data.userId);
};

// Get authenticated user from socket
export const getSocketUser = (socket: AuthenticatedSocket) => {
  return socket.data.user;
};

// Get user ID from socket
export const getSocketUserId = (socket: AuthenticatedSocket) => {
  return socket.data.userId;
};