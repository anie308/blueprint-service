import { Server as SocketIOServer } from 'socket.io';
import { User } from '../models';
import { UserStatus, PresenceData, ConnectionInfo, getRoomName } from '../types/socket';
import { AuthenticatedSocket } from '../middleware/socketAuth';

// In-memory presence tracking (for production, consider Redis)
class PresenceService {
  private connections = new Map<string, ConnectionInfo>(); // socketId -> ConnectionInfo
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private userStatus = new Map<string, UserStatus>(); // userId -> status
  private io: SocketIOServer | null = null;

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  // Add user connection
  addConnection(socket: AuthenticatedSocket) {
    const { id: socketId } = socket;
    const userId = socket.data.userId;

    if (!userId) return;

    // Store connection info
    const connectionInfo: ConnectionInfo = {
      socketId,
      userId,
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    this.connections.set(socketId, connectionInfo);

    // Track user's sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);

    // Update user status to online if it's their first connection
    const userSocketsCount = this.userSockets.get(userId)!.size;
    if (userSocketsCount === 1) {
      this.setUserStatus(userId, 'online');
    }

    // Update last seen in database
    this.updateLastSeen(userId);
  }

  // Remove user connection
  removeConnection(socket: AuthenticatedSocket) {
    const { id: socketId } = socket;
    const connectionInfo = this.connections.get(socketId);

    if (!connectionInfo) return;

    const { userId } = connectionInfo;

    // Remove connection
    this.connections.delete(socketId);

    // Remove from user's socket set
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);

      // If no more connections, set user offline
      if (userSockets.size === 0) {
        this.setUserStatus(userId, 'offline');
        this.userSockets.delete(userId);
      }
    }

    // Update last seen in database
    this.updateLastSeen(userId);
  }

  // Set user status
  setUserStatus(userId: string, status: UserStatus) {
    const previousStatus = this.userStatus.get(userId);
    this.userStatus.set(userId, status);

    // Emit status change if different
    if (previousStatus !== status && this.io) {
      this.emitStatusChange(userId, status);
    }
  }

  // Get user status
  getUserStatus(userId: string): UserStatus {
    return this.userStatus.get(userId) || 'offline';
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  // Get all online users
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  // Get user's socket IDs
  getUserSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  // Update last activity for a connection
  updateActivity(socketId: string) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  // Get online status for multiple users
  getMultipleUserStatuses(userIds: string[]): Map<string, UserStatus> {
    const statuses = new Map<string, UserStatus>();
    
    for (const userId of userIds) {
      statuses.set(userId, this.getUserStatus(userId));
    }
    
    return statuses;
  }

  // Emit status change to relevant users
  private async emitStatusChange(userId: string, status: UserStatus) {
    if (!this.io) return;

    try {
      const user = await User.findById(userId).select('username profilePictureUrl');
      if (!user) return;

      const presenceData: PresenceData = {
        userId,
        username: user.username,
        status,
        lastSeen: status === 'offline' ? new Date() : undefined
      };

      // Emit to user's own room for their other devices
      this.io.to(getRoomName.user(userId)).emit('userStatusChanged', presenceData);

      // Emit to all conversations this user is part of
      // Note: In a real implementation, you'd want to get user's conversations
      // and emit only to participants of those conversations
      this.io.emit(status === 'online' ? 'userOnline' : 'userOffline', presenceData);

    } catch (error) {
      console.error('Error emitting status change:', error);
    }
  }

  // Update last seen timestamp in database
  private async updateLastSeen(userId: string) {
    try {
      await User.findByIdAndUpdate(userId, { 
        lastSeen: new Date() 
      });
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }

  // Clean up inactive connections (call this periodically)
  cleanupInactiveConnections() {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [socketId, connection] of this.connections.entries()) {
      if (now.getTime() - connection.lastActivity.getTime() > inactiveThreshold) {
        // Mark as away instead of removing
        const userId = connection.userId;
        const currentStatus = this.getUserStatus(userId);
        
        if (currentStatus === 'online') {
          this.setUserStatus(userId, 'away');
        }
      }
    }
  }

  // Get connection stats
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userSockets.size,
      onlineUsers: this.getOnlineUsers().length
    };
  }
}

// Export singleton instance
export const presenceService = new PresenceService();

// Start cleanup interval
setInterval(() => {
  presenceService.cleanupInactiveConnections();
}, 60000); // Run every minute