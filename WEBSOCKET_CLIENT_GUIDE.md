# WebSocket Client Integration Guide

## Overview

Blueprint-XYZ backend now supports real-time messaging through WebSocket connections using Socket.IO. This guide shows how to integrate the WebSocket client in your frontend application.

## Installation

### For React/Next.js
```bash
npm install socket.io-client
```

### For React Native
```bash
npm install socket.io-client react-native-get-random-values
```

## Basic Client Setup

### 1. Initialize Socket Connection

```typescript
// socketClient.ts
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  username: string;
  profilePictureUrl?: string;
}

interface Message {
  id: string;
  content: string;
  senderId: User;
  conversationId: string;
  sentAt: string;
  readBy: string[];
}

interface Conversation {
  id: string;
  participants: User[];
  lastMessageId?: string;
}

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;
    
    this.socket = io('ws://localhost:3000', {
      auth: {
        token: token
      },
      transports: ['websocket'],
      autoConnect: true
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
    });

    // Authentication events
    this.socket.on('authenticated', (user: User) => {
      console.log('✅ Authenticated as:', user.username);
    });

    this.socket.on('authenticationError', (error: string) => {
      console.error('🔐 Auth error:', error);
    });

    // Message events
    this.socket.on('newMessage', (data: { message: Message; conversation: Conversation }) => {
      console.log('📩 New message:', data.message);
      // Handle new message in your app
      this.onNewMessage?.(data);
    });

    this.socket.on('messageRead', (data: { messageId: string; conversationId: string; readBy: string }) => {
      console.log('👀 Message read:', data);
      // Update message read status
      this.onMessageRead?.(data);
    });

    // Typing events
    this.socket.on('userStartedTyping', (data: { conversationId: string; userId: string; username: string }) => {
      console.log('✏️ User started typing:', data.username);
      this.onUserStartedTyping?.(data);
    });

    this.socket.on('userStoppedTyping', (data: { conversationId: string; userId: string; username: string }) => {
      console.log('✏️ User stopped typing:', data.username);
      this.onUserStoppedTyping?.(data);
    });

    // Presence events
    this.socket.on('userOnline', (data: { userId: string; username: string; status: string }) => {
      console.log('🟢 User online:', data.username);
      this.onUserOnline?.(data);
    });

    this.socket.on('userOffline', (data: { userId: string; username: string; status: string; lastSeen?: string }) => {
      console.log('⚪ User offline:', data.username);
      this.onUserOffline?.(data);
    });
  }

  // Send message
  sendMessage(conversationId: string, content: string, recipientId?: string) {
    if (!this.socket) return;
    
    this.socket.emit('sendMessage', {
      conversationId,
      content,
      recipientId
    });
  }

  // Join conversation room
  joinConversation(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('joinConversation', conversationId);
  }

  // Leave conversation room
  leaveConversation(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('leaveConversation', conversationId);
  }

  // Mark message as read
  markMessageAsRead(messageId: string) {
    if (!this.socket) return;
    this.socket.emit('markMessageAsRead', messageId);
  }

  // Typing indicators
  startTyping(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('startTyping', conversationId);
  }

  stopTyping(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('stopTyping', conversationId);
  }

  // Update user status
  updateStatus(status: 'online' | 'away' | 'busy' | 'offline') {
    if (!this.socket) return;
    this.socket.emit('updateStatus', status);
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event handlers (set these from your app)
  onNewMessage?: (data: { message: Message; conversation: Conversation }) => void;
  onMessageRead?: (data: { messageId: string; conversationId: string; readBy: string }) => void;
  onUserStartedTyping?: (data: { conversationId: string; userId: string; username: string }) => void;
  onUserStoppedTyping?: (data: { conversationId: string; userId: string; username: string }) => void;
  onUserOnline?: (data: { userId: string; username: string; status: string }) => void;
  onUserOffline?: (data: { userId: string; username: string; status: string; lastSeen?: string }) => void;
}

export const socketClient = new SocketClient();
```

### 2. React Hook Integration

```typescript
// useSocket.ts
import { useEffect, useCallback } from 'react';
import { socketClient } from './socketClient';

export const useSocket = (token: string | null) => {
  useEffect(() => {
    if (token) {
      socketClient.connect(token);
    }

    return () => {
      socketClient.disconnect();
    };
  }, [token]);

  const sendMessage = useCallback((conversationId: string, content: string, recipientId?: string) => {
    socketClient.sendMessage(conversationId, content, recipientId);
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    socketClient.joinConversation(conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketClient.leaveConversation(conversationId);
  }, []);

  const markMessageAsRead = useCallback((messageId: string) => {
    socketClient.markMessageAsRead(messageId);
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    socketClient.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketClient.stopTyping(conversationId);
  }, []);

  return {
    sendMessage,
    joinConversation,
    leaveConversation,
    markMessageAsRead,
    startTyping,
    stopTyping,
    socketClient
  };
};
```

### 3. React Component Example

```typescript
// ChatComponent.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './useSocket';

interface ChatComponentProps {
  conversationId: string;
  currentUserId: string;
  token: string;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ 
  conversationId, 
  currentUserId, 
  token 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const { 
    sendMessage, 
    joinConversation, 
    leaveConversation, 
    markMessageAsRead,
    startTyping,
    stopTyping,
    socketClient 
  } = useSocket(token);

  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Join conversation when component mounts
    joinConversation(conversationId);

    // Set up event handlers
    socketClient.onNewMessage = ({ message, conversation }) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
        
        // Mark as read if message is not from current user
        if (message.senderId.id !== currentUserId) {
          markMessageAsRead(message.id);
        }
      }
    };

    socketClient.onMessageRead = ({ messageId, readBy }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, readBy: [...msg.readBy, readBy] }
            : msg
        )
      );
    };

    socketClient.onUserStartedTyping = ({ conversationId: convId, userId, username }) => {
      if (convId === conversationId && userId !== currentUserId) {
        setTypingUsers(prev => new Set([...prev, username]));
      }
    };

    socketClient.onUserStoppedTyping = ({ conversationId: convId, userId, username }) => {
      if (convId === conversationId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(username);
          return newSet;
        });
      }
    };

    socketClient.onUserOnline = ({ userId, username }) => {
      setOnlineUsers(prev => new Set([...prev, username]));
    };

    socketClient.onUserOffline = ({ userId, username }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    };

    return () => {
      leaveConversation(conversationId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, currentUserId]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(conversationId, newMessage.trim());
      setNewMessage('');
      stopTyping(conversationId);
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    // Start typing indicator
    startTyping(conversationId);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId);
    }, 3000);
  };

  return (
    <div className="chat-container">
      {/* Online users indicator */}
      <div className="online-users">
        Online: {Array.from(onlineUsers).join(', ')}
      </div>

      {/* Messages */}
      <div className="messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.senderId.id === currentUserId ? 'own' : 'other'}`}
          >
            <div className="message-content">{message.content}</div>
            <div className="message-meta">
              {message.senderId.username} - {new Date(message.sentAt).toLocaleTimeString()}
              {message.readBy.length > 1 && ' ✓✓'}
            </div>
          </div>
        ))}
      </div>

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div className="typing-indicator">
          {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input */}
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatComponent;
```

## Key Features

### ✅ Real-time Messaging
- Instant message delivery
- Message read receipts
- Message persistence

### ✅ Typing Indicators
- Real-time typing status
- Automatic cleanup on disconnect
- Multiple users typing support

### ✅ User Presence
- Online/offline status
- Last seen timestamps
- Custom status (online, away, busy, offline)

### ✅ Authentication
- JWT-based socket authentication
- Secure connection handling
- Auto-reconnection with token refresh

### ✅ Room Management
- Conversation-based rooms
- User-specific rooms
- Automatic room joining/leaving

## Connection Flow

1. **Client connects** with JWT token
2. **Server authenticates** and joins user to personal room
3. **Client joins conversation rooms** as needed
4. **Real-time events** flow through appropriate rooms
5. **Client handles** incoming events and updates UI

## Error Handling

```typescript
socketClient.socket?.on('connect_error', (error) => {
  console.error('Connection failed:', error);
  // Handle connection errors (show retry button, etc.)
});

socketClient.socket?.on('messagingError', (error: string) => {
  console.error('Messaging error:', error);
  // Show user-friendly error message
});
```

## Production Considerations

1. **Reconnection**: Implement automatic reconnection logic
2. **Token Refresh**: Handle JWT token expiration
3. **Error Handling**: Graceful degradation when WebSocket fails
4. **Offline Support**: Queue messages when offline
5. **Performance**: Implement message pagination and cleanup

This WebSocket implementation provides a robust foundation for real-time messaging in your Blueprint-XYZ application!