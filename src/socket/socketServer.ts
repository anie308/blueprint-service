import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { Conversation, Message, User } from "../models";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  SOCKET_EVENTS,
  getRoomName,
  SendMessageData,
  NewMessageData,
  MessageReadData,
  TypingData,
} from "../types/socket";
import {
  AuthenticatedSocket,
  authenticateSocket,
  authenticateSocketEvent,
  requireSocketAuth,
  getSocketUser,
  getSocketUserId,
} from "../middleware/socketAuth";
import { presenceService } from "../services/presenceService";
import { config } from "../config";
import { Types } from 'mongoose';

// Typing status tracking (in memory)
const typingStatus = new Map<string, Set<string>>(); // conversationId -> Set of userIds

export class SocketServer {
  private io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
  >;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Set up presence service
    presenceService.setSocketIO(this.io);

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(authenticateSocket);
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      console.log(
        `User ${socket.data.user?.username} connected (${socket.id})`
      );

      // Add to presence tracking
      presenceService.addConnection(socket);

      // Join user's personal room
      if (socket.data.userId) {
        socket.join(getRoomName.user(socket.data.userId));
      }

      // Handle authentication (for manual auth)
      socket.on(SOCKET_EVENTS.AUTHENTICATE, async (token: string) => {
        const isAuthenticated = await authenticateSocketEvent(socket, token);

        if (isAuthenticated && socket.data.user) {
          socket.emit(SOCKET_EVENTS.AUTHENTICATED, socket.data.user);

          // Join user's personal room
          socket.join(getRoomName.user(socket.data.userId!));

          // Add to presence tracking
          presenceService.addConnection(socket);
        } else {
          socket.emit(
            SOCKET_EVENTS.AUTHENTICATION_ERROR,
            "Authentication failed"
          );
        }
      });

      // Handle messaging events
      this.setupMessagingHandlers(socket);

      // Handle typing events
      this.setupTypingHandlers(socket);

      // Handle presence events
      this.setupPresenceHandlers(socket);

      // Handle conversation events
      this.setupConversationHandlers(socket);

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(
          `User ${socket.data.user?.username} disconnected: ${reason}`
        );

        // Remove from presence tracking
        presenceService.removeConnection(socket);

        // Clean up typing status
        this.cleanupUserTyping(socket);
      });
    });
  }

  private setupMessagingHandlers(socket: AuthenticatedSocket) {
    // Send message
    socket.on(
      SOCKET_EVENTS.SEND_MESSAGE,
      async (data: SendMessageData): Promise<void> => {
        if (!requireSocketAuth(socket)) {
          socket.emit(SOCKET_EVENTS.MESSAGING_ERROR, "Authentication required");
          return;
        }

        try {
          const { conversationId, content, recipientId } = data;
          const senderId = getSocketUserId(socket)!;
          let conversation;

          if (conversationId) {
            // Existing conversation
            conversation = await Conversation.findById(conversationId);

            // if (
            //   !conversation ||
            //   !conversation.participants.includes(senderId)
            // ) {
            //   return socket.emit(
            //     SOCKET_EVENTS.MESSAGING_ERROR,
            //     "Conversation not found or access denied"
            //   );
            // }

            if (!conversation || !conversation.participants.some(p => p.equals(new Types.ObjectId(senderId)))) {
               socket.emit(SOCKET_EVENTS.MESSAGING_ERROR, 'Conversation not found or access denied');
               return;
            }
          } else if (recipientId) {
            // New conversation
            const recipientObjectId = new Types.ObjectId(recipientId);
            const senderObjectId = new Types.ObjectId(senderId);
            conversation = await Conversation.findOne({
              participants: { $all: [senderObjectId, recipientObjectId] },
            });

            if (!conversation) {
              conversation = await Conversation.create({
                participants: [senderObjectId, recipientObjectId],
              });
            }
          } else {
             socket.emit(
              SOCKET_EVENTS.MESSAGING_ERROR,
              "Conversation ID or recipient ID required"
            );
            return;
          }

          if (!conversation) {
            socket.emit(SOCKET_EVENTS.MESSAGING_ERROR, "Conversation not found or could not be created");
            return;
          }

          // Create message
          const message = await Message.create({
            conversationId: conversation._id,
            senderId: new Types.ObjectId(senderId),
            content,
            readBy: [new Types.ObjectId(senderId)],
          });

          // Update conversation
          conversation.lastMessageId = new Types.ObjectId(message._id);
          await conversation.save();

          // Populate message and conversation
          await message.populate("senderId", "username profilePictureUrl");
          await conversation.populate(
            "participants",
            "username profilePictureUrl"
          );

          const messageData: NewMessageData = {
            message,
            conversation,
          };

          // Emit to conversation room
          this.io
            .to(getRoomName.conversation(conversation._id.toString()))
            .emit(SOCKET_EVENTS.NEW_MESSAGE, messageData);

          // Also emit to all participants' personal rooms
          for (const participantId of conversation.participants) {
            if (participantId.toString() !== senderId) {
              this.io
                .to(getRoomName.user(participantId.toString()))
                .emit(SOCKET_EVENTS.NEW_MESSAGE, messageData);
            }
          }
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit(SOCKET_EVENTS.MESSAGING_ERROR, "Failed to send message");
        }
      }
    );

    // Mark message as read
    socket.on(SOCKET_EVENTS.MARK_MESSAGE_AS_READ, async (messageId: string) => {
      if (!requireSocketAuth(socket)) return;

      try {
        const userId = getSocketUserId(socket)!;
        const message = await Message.findById(messageId);

        if (!message) return;

        // Check if user is participant in the conversation
        const conversation = await Conversation.findById(
          message.conversationId
        );
        if (!conversation) return; // Added null check for conversation

        const userObjectId = new Types.ObjectId(userId);
        if (!conversation.participants.some(p => p.equals(userObjectId)))
          return;

        // Add user to readBy array if not already there
        if (!message.readBy.some(r => r.equals(userObjectId))) {
          message.readBy.push(userObjectId);
          await message.save();

          const readData: MessageReadData = {
            messageId,
            conversationId: message.conversationId.toString(),
            readBy: userId,
          };

          // Emit to conversation room
          this.io
            .to(getRoomName.conversation(message.conversationId.toString()))
            .emit(SOCKET_EVENTS.MESSAGE_READ, readData);
        }
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });
  }

  private setupTypingHandlers(socket: AuthenticatedSocket) {
    // Start typing
    socket.on(SOCKET_EVENTS.START_TYPING, async (conversationId: string) => {
      if (!requireSocketAuth(socket)) return;

      const user = getSocketUser(socket);
      const userId = getSocketUserId(socket)!;

      if (!user) return;

      // Check if user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return; // Added null check

      const userObjectId = new Types.ObjectId(userId);
      if (!conversation.participants.some(p => p.equals(userObjectId))) return;

      // Add to typing status
      if (!typingStatus.has(conversationId)) {
        typingStatus.set(conversationId, new Set());
      }
      typingStatus.get(conversationId)!.add(userId);

      const typingData: TypingData = {
        conversationId,
        userId,
        username: user.username,
      };

      // Emit to others in conversation
      socket
        .to(getRoomName.conversation(conversationId))
        .emit(SOCKET_EVENTS.USER_STARTED_TYPING, typingData);
    });

    // Stop typing
    socket.on(SOCKET_EVENTS.STOP_TYPING, async (conversationId: string) => {
      if (!requireSocketAuth(socket)) return;

      const user = getSocketUser(socket);
      const userId = getSocketUserId(socket)!;

      if (!user) return;

      // Remove from typing status
      const conversationTypers = typingStatus.get(conversationId);
      if (conversationTypers) {
        conversationTypers.delete(userId);

        if (conversationTypers.size === 0) {
          typingStatus.delete(conversationId);
        }
      }

      const typingData: TypingData = {
        conversationId,
        userId,
        username: user.username,
      };

      // Emit to others in conversation
      socket
        .to(getRoomName.conversation(conversationId))
        .emit(SOCKET_EVENTS.USER_STOPPED_TYPING, typingData);
    });
  }

  private setupPresenceHandlers(socket: AuthenticatedSocket) {
    // Update status
    socket.on(SOCKET_EVENTS.UPDATE_STATUS, (status) => {
      if (!requireSocketAuth(socket)) return;

      const userId = getSocketUserId(socket)!;
      presenceService.setUserStatus(userId, status);
    });
  }

  private setupConversationHandlers(socket: AuthenticatedSocket) {
    // Join conversation room
    socket.on(
      SOCKET_EVENTS.JOIN_CONVERSATION,
      async (conversationId: string) => {
        if (!requireSocketAuth(socket)) return;

        const userId = getSocketUserId(socket)!;

        // Verify user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return; // Added null check

        const userObjectId = new Types.ObjectId(userId);
        if (!conversation.participants.some(p => p.equals(userObjectId)))
          return;

        socket.join(getRoomName.conversation(conversationId));
      }
    );

    // Leave conversation room
    socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (conversationId: string) => {
      socket.leave(getRoomName.conversation(conversationId));
    });
  }

  private cleanupUserTyping(socket: AuthenticatedSocket) {
    const userId = getSocketUserId(socket);
    if (!userId) return;

    // Remove user from all typing statuses
    for (const [conversationId, typersSet] of typingStatus.entries()) {
      if (typersSet.has(userId)) {
        typersSet.delete(userId);

        if (typersSet.size === 0) {
          typingStatus.delete(conversationId);
        }

        // Emit stop typing to conversation
        socket
          .to(getRoomName.conversation(conversationId))
          .emit(SOCKET_EVENTS.USER_STOPPED_TYPING, {
            conversationId,
            userId,
            username: socket.data.user?.username || "Unknown",
          });
      }
    }
  }

  // Public method to emit events from HTTP endpoints
  public emitToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
    this.io.to(getRoomName.user(userId)).emit(event, data);
  }

  public emitToConversation(conversationId: string, event: keyof ServerToClientEvents, data: any) {
    this.io.to(getRoomName.conversation(conversationId)).emit(event, data);
  }

  public getIO() {
    return this.io;
  }
}

// Export singleton instance
let socketServer: SocketServer;

export const initializeSocketServer = (
  httpServer: HTTPServer
): SocketServer => {
  socketServer = new SocketServer(httpServer);
  return socketServer;
};

export const getSocketServer = (): SocketServer => {
  if (!socketServer) {
    throw new Error("Socket server not initialized");
  }
  return socketServer;
};
