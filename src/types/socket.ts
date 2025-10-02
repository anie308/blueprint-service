import { IUser, IMessage, IConversation } from '../models';

// Socket Events - Client to Server
export interface ClientToServerEvents {
  // Authentication
  authenticate: (token: string) => void;

  // Messaging
  sendMessage: (data: SendMessageData) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  markMessageAsRead: (messageId: string) => void;

  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;

  // Presence
  updateStatus: (status: UserStatus) => void;
}

// Socket Events - Server to Client
export interface ServerToClientEvents {
  // Authentication
  authenticated: (user: IUser) => void;
  authenticationError: (error: string) => void;

  // Messaging
  newMessage: (data: NewMessageData) => void;
  messageRead: (data: MessageReadData) => void;
  messagingError: (error: string) => void;

  // Typing indicators
  userStartedTyping: (data: TypingData) => void;
  userStoppedTyping: (data: TypingData) => void;

  // Presence
  userOnline: (data: PresenceData) => void;
  userOffline: (data: PresenceData) => void;
  userStatusChanged: (data: PresenceData) => void;

  // Conversation updates
  conversationUpdated: (conversation: IConversation) => void;
}

// Socket Data Interfaces
export interface SendMessageData {
  conversationId: string;
  content: string;
  recipientId?: string; // For new conversations
}

export interface NewMessageData {
  message: IMessage;
  conversation: IConversation;
}

export interface MessageReadData {
  messageId: string;
  conversationId: string;
  readBy: string; // userId
}

export interface TypingData {
  conversationId: string;
  userId: string;
  username: string;
}

export interface PresenceData {
  userId: string;
  username: string;
  status: UserStatus;
  lastSeen: Date | undefined;
}

// User Status Types
export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

// Extended Socket Interface
export interface SocketData {
  user?: IUser;
  userId?: string;
}

// Room naming conventions
export const ROOM_TYPES = {
  CONVERSATION: 'conversation:',
  USER: 'user:'
} as const;

// Socket Events Names (for consistency)
export const SOCKET_EVENTS = {
  // Authentication
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  AUTHENTICATION_ERROR: 'authenticationError',

  // Messaging
  SEND_MESSAGE: 'sendMessage',
  NEW_MESSAGE: 'newMessage',
  JOIN_CONVERSATION: 'joinConversation',
  LEAVE_CONVERSATION: 'leaveConversation',
  MARK_MESSAGE_AS_READ: 'markMessageAsRead',
  MESSAGE_READ: 'messageRead',
  MESSAGING_ERROR: 'messagingError',

  // Typing
  START_TYPING: 'startTyping',
  STOP_TYPING: 'stopTyping',
  USER_STARTED_TYPING: 'userStartedTyping',
  USER_STOPPED_TYPING: 'userStoppedTyping',

  // Presence
  UPDATE_STATUS: 'updateStatus',
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
  USER_STATUS_CHANGED: 'userStatusChanged',

  // Conversation
  CONVERSATION_UPDATED: 'conversationUpdated'
} as const;

// Utility functions for room management
export const getRoomName = {
  conversation: (conversationId: string) => `${ROOM_TYPES.CONVERSATION}${conversationId}`,
  user: (userId: string) => `${ROOM_TYPES.USER}${userId}`
};

// Error types
export interface SocketError {
  code: string;
  message: string;
  details?: any;
}

// Connection status
export interface ConnectionInfo {
  socketId: string;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
}