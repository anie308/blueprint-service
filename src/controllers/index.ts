// // Reel Routes
// export * as reelController from './reelController';

// // Messages Controller
// import { Response, NextFunction } from 'express';
// import { Conversation, Message } from '../models';
// import { AuthenticatedRequest } from '../middleware/auth';
// import { catchAsync, AppError, sendSuccessResponse, sendPaginatedResponse } from '../middleware/errorHandler';
// import { getSocketServer } from '../socket/socketServer';
// import { SOCKET_EVENTS, NewMessageData } from '../types/socket';

// export const messageController = {
//   // Get user's conversations
//   getConversations: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const conversations = await Conversation.find({ participants: req.user._id })
//       .populate('participants', 'username profilePictureUrl')
//       .populate('lastMessageId')
//       .sort({ updatedAt: -1 });
//     sendSuccessResponse(res, 200, 'Conversations retrieved successfully', { conversations });
//   }),

//   // Get messages in a conversation
//   getConversationMessages: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const { conversationId } = req.params;
//     const { page = 1, limit = 50 } = req.query;
//     const pageNum = parseInt(page as string);
//     const limitNum = parseInt(limit as string);
//     const skip = (pageNum - 1) * limitNum;

//     const conversation = await Conversation.findById(conversationId);
//     if (!conversation || !conversation.participants.includes(req.user._id)) {
//       return next(new AppError('Conversation not found or access denied', 404));
//     }

//     const [messages, total] = await Promise.all([
//       Message.find({ conversationId }).populate('senderId', 'username profilePictureUrl')
//         .sort({ sentAt: -1 }).skip(skip).limit(limitNum),
//       Message.countDocuments({ conversationId })
//     ]);

//     const totalPages = Math.ceil(total / limitNum);
//     sendPaginatedResponse(res, 200, 'Messages retrieved successfully', messages.reverse(), {
//       page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
//     });
//   }),

//   // Start conversation or send message
//   sendMessage: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const { userId } = req.params;
//     const { content } = req.body;

//     let conversation = await Conversation.findOne({
//       participants: { $all: [req.user._id, userId] }
//     });

//     if (!conversation) {
//       conversation = await Conversation.create({
//         participants: [req.user._id, userId]
//       });
//     }

//     const message = await Message.create({
//       conversationId: conversation._id,
//       senderId: req.user._id,
//       content,
//       readBy: [req.user._id]
//     });

//     conversation.lastMessageId = message._id;
//     await conversation.save();

//     await message.populate('senderId', 'username profilePictureUrl');
//     await conversation.populate('participants', 'username profilePictureUrl');
    
//     // Emit real-time event
//     try {
//       const socketServer = getSocketServer();
//       const messageData: NewMessageData = { message, conversation };
      
//       // Emit to all participants except sender
//       for (const participantId of conversation.participants) {
//         if (participantId.toString() !== req.user._id) {
//           socketServer.emitToUser(participantId.toString(), SOCKET_EVENTS.NEW_MESSAGE, messageData);
//         }
//       }
//     } catch (error) {
//       // Socket server might not be initialized in tests
//       console.warn('Could not emit socket event:', error);
//     }
    
//     sendSuccessResponse(res, 201, 'Message sent successfully', { message });
//   }),

//   // Send message to existing conversation
//   sendMessageToConversation: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const { conversationId } = req.params;
//     const { content } = req.body;

//     const conversation = await Conversation.findById(conversationId);
//     if (!conversation || !conversation.participants.includes(req.user._id)) {
//       return next(new AppError('Conversation not found or access denied', 404));
//     }

//     const message = await Message.create({
//       conversationId,
//       senderId: req.user._id,
//       content,
//       readBy: [req.user._id]
//     });

//     conversation.lastMessageId = message._id;
//     await conversation.save();

//     await message.populate('senderId', 'username profilePictureUrl');
//     await conversation.populate('participants', 'username profilePictureUrl');
    
//     // Emit real-time event
//     try {
//       const socketServer = getSocketServer();
//       const messageData: NewMessageData = { message, conversation };
      
//       // Emit to all participants except sender
//       for (const participantId of conversation.participants) {
//         if (participantId.toString() !== req.user._id) {
//           socketServer.emitToUser(participantId.toString(), SOCKET_EVENTS.NEW_MESSAGE, messageData);
//         }
//       }
//     } catch (error) {
//       // Socket server might not be initialized in tests
//       console.warn('Could not emit socket event:', error);
//     }
    
//     sendSuccessResponse(res, 201, 'Message sent successfully', { message });
//   }),

//   // Mark message as read
//   markAsRead: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const { messageId } = req.params;

//     const message = await Message.findById(messageId);
//     if (!message) return next(new AppError('Message not found', 404));

//     if (!message.readBy.includes(req.user._id)) {
//       message.readBy.push(req.user._id);
//       await message.save();
//     }

//     sendSuccessResponse(res, 200, 'Message marked as read');
//   })
// };

// // Notifications Controller
// import { Notification } from '../models';

// export const notificationController = {
//   // Get user's notifications
//   getNotifications: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const { page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page as string);
//     const limitNum = parseInt(limit as string);
//     const skip = (pageNum - 1) * limitNum;

//     const [notifications, total] = await Promise.all([
//       Notification.find({ recipientId: req.user._id })
//         .populate('sourceId')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum),
//       Notification.countDocuments({ recipientId: req.user._id })
//     ]);

//     const totalPages = Math.ceil(total / limitNum);
//     sendPaginatedResponse(res, 200, 'Notifications retrieved successfully', notifications, {
//       page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
//     });
//   }),

//   // Mark notification as read
//   markAsRead: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const { id } = req.params;

//     const notification = await Notification.findOne({ _id: id, recipientId: req.user._id });
//     if (!notification) return next(new AppError('Notification not found', 404));

//     notification.isRead = true;
//     await notification.save();

//     sendSuccessResponse(res, 200, 'Notification marked as read');
//   }),

//   // Mark all notifications as read
//   markAllAsRead: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));

//     await Notification.updateMany(
//       { recipientId: req.user._id, isRead: false },
//       { isRead: true }
//     );

//     sendSuccessResponse(res, 200, 'All notifications marked as read');
//   })
// };

// // Saved Items Controller
// import { SavedItem } from '../models';

// export const savedController = {
//   // Get user's saved items
//   getSavedItems: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const { page = 1, limit = 20, entityType } = req.query;
//     const pageNum = parseInt(page as string);
//     const limitNum = parseInt(limit as string);
//     const skip = (pageNum - 1) * limitNum;

//     const query: any = { userId: req.user._id };
//     if (entityType) query.entityType = entityType;

//     const [savedItems, total] = await Promise.all([
//       SavedItem.find(query)
//         .populate('entityId')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum),
//       SavedItem.countDocuments(query)
//     ]);

//     const totalPages = Math.ceil(total / limitNum);
//     sendPaginatedResponse(res, 200, 'Saved items retrieved successfully', savedItems, {
//       page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
//     });
//   }),

//   // Save an item
//   saveItem: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const { entityId, entityType } = req.body;

//     const existing = await SavedItem.findOne({
//       userId: req.user._id,
//       entityId,
//       entityType
//     });

//     if (existing) return next(new AppError('Item already saved', 400));

//     const savedItem = await SavedItem.create({
//       userId: req.user._id,
//       entityId,
//       entityType
//     });

//     sendSuccessResponse(res, 201, 'Item saved successfully', { savedItem });
//   }),

//   // Unsave an item
//   unsaveItem: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user) return next(new AppError('Authentication required', 401));
//     const { entityId, entityType } = req.params;

//     const result = await SavedItem.findOneAndDelete({
//       userId: req.user._id,
//       entityId,
//       entityType
//     });

//     if (!result) return next(new AppError('Saved item not found', 404));

//     sendSuccessResponse(res, 200, 'Item unsaved successfully');
//   })
// };

// // Feed Controller
// import { Project, Post, Reel } from '../models';

// export const feedController = {
//   // Get personalized feed
//   getFeed: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const { page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page as string);
//     const limitNum = parseInt(limit as string);
//     const skip = (pageNum - 1) * limitNum;

//     // For now, return recent content from all types
//     const [projects, posts, reels] = await Promise.all([
//       Project.find().populate('authorId').sort({ createdAt: -1 }).limit(limitNum / 3),
//       Post.find().populate('authorId').sort({ createdAt: -1 }).limit(limitNum / 3),
//       Reel.find().populate('authorId').sort({ createdAt: -1 }).limit(limitNum / 3)
//     ]);

//     const feed = [...projects, ...posts, ...reels]
//       .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
//       .slice(skip, skip + limitNum);

//     sendPaginatedResponse(res, 200, 'Feed retrieved successfully', feed, {
//       page: pageNum, limit: limitNum, total: feed.length, totalPages: 1, hasNext: false, hasPrev: false
//     });
//   }),

//   // Get trending content
//   getTrending: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const { page = 1, limit = 20 } = req.query;
//     const pageNum = parseInt(page as string);
//     const limitNum = parseInt(limit as string);
//     const skip = (pageNum - 1) * limitNum;

//     // Get trending based on likes and views
//     const [projects, posts, reels] = await Promise.all([
//       Project.find().populate('authorId').sort({ likesCount: -1, viewsCount: -1 }).limit(limitNum / 3),
//       Post.find().populate('authorId').sort({ likesCount: -1 }).limit(limitNum / 3),
//       Reel.find().populate('authorId').sort({ likesCount: -1, viewsCount: -1 }).limit(limitNum / 3)
//     ]);

//     const trending = [...projects, ...posts, ...reels]
//       .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
//       .slice(skip, skip + limitNum);

//     sendPaginatedResponse(res, 200, 'Trending content retrieved successfully', trending, {
//       page: pageNum, limit: limitNum, total: trending.length, totalPages: 1, hasNext: false, hasPrev: false
//     });
//   })
// };


// Reel Routes
export * as reelController from './reelController';

// Messages Controller
import { Response, NextFunction } from 'express';
import { Conversation, Message } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { catchAsync, AppError, sendSuccessResponse, sendPaginatedResponse } from '../middleware/errorHandler';
import { getSocketServer } from '../socket/socketServer';
import { SOCKET_EVENTS, NewMessageData } from '../types/socket';
import { ObjectId, Types } from 'mongoose';

export const messageController = {
  // Get user's conversations
  getConversations: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    
    const userId = new Types.ObjectId(req.user._id);
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'username profilePictureUrl')
      .populate('lastMessageId')
      .sort({ updatedAt: -1 });
    
    sendSuccessResponse(res, 200, 'Conversations retrieved successfully', { conversations });
  }),

  // Get messages in a conversation
  getConversationMessages: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const userId = new Types.ObjectId(req.user._id);
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.participants.some(participant => participant.equals(userId))) {
      return next(new AppError('Conversation not found or access denied', 404));
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversationId }).populate('senderId', 'username profilePictureUrl')
        .sort({ sentAt: -1 }).skip(skip).limit(limitNum),
      Message.countDocuments({ conversationId })
    ]);

    const totalPages = Math.ceil(total / limitNum);
    sendPaginatedResponse(res, 200, 'Messages retrieved successfully', messages.reverse(), {
      page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
    });
  }),

  // Start conversation or send message
  sendMessage: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const { userId } = req.params;
    const { content } = req.body;

    const currentUserId = new Types.ObjectId(req.user._id);
    const targetUserId = new Types.ObjectId(userId);

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, targetUserId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, targetUserId]
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: currentUserId,
      content,
      readBy: [currentUserId]
    });

    conversation.lastMessageId = new Types.ObjectId(message._id);
    await conversation.save();

    await message.populate('senderId', 'username profilePictureUrl');
    await conversation.populate('participants', 'username profilePictureUrl');
    
    // Emit real-time event
    try {
      const socketServer = getSocketServer();
      const messageData: NewMessageData = { message, conversation };
      
      // Emit to all participants except sender
      for (const participantId of conversation.participants) {
        if (!participantId.equals(currentUserId)) {
          socketServer.emitToUser(participantId.toString(), SOCKET_EVENTS.NEW_MESSAGE, messageData);
        }
      }
    } catch (error) {
      // Socket server might not be initialized in tests
      console.warn('Could not emit socket event:', error);
    }
    
    sendSuccessResponse(res, 201, 'Message sent successfully', { message });
  }),

  // Send message to existing conversation
  sendMessageToConversation: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const { conversationId } = req.params;
    const { content } = req.body;

    const userId = new Types.ObjectId(req.user._id);
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.participants.some(participant => participant.equals(userId))) {
      return next(new AppError('Conversation not found or access denied', 404));
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      content,
      readBy: [userId]
    });

    conversation.lastMessageId = new Types.ObjectId(message._id);
    await conversation.save();

    await message.populate('senderId', 'username profilePictureUrl');
    await conversation.populate('participants', 'username profilePictureUrl');
    
    // Emit real-time event
    try {
      const socketServer = getSocketServer();
      const messageData: NewMessageData = { message, conversation };
      
      // Emit to all participants except sender
      for (const participantId of conversation.participants) {
        if (!participantId.equals(userId)) {
          socketServer.emitToUser(participantId.toString(), SOCKET_EVENTS.NEW_MESSAGE, messageData);
        }
      }
    } catch (error) {
      // Socket server might not be initialized in tests
      console.warn('Could not emit socket event:', error);
    }
    
    sendSuccessResponse(res, 201, 'Message sent successfully', { message });
  }),

  // Mark message as read
  markAsRead: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const { messageId } = req.params;

    const userId = new Types.ObjectId(req.user._id);
    const message = await Message.findById(messageId);
    if (!message) return next(new AppError('Message not found', 404));

    const userObjectId = new Types.ObjectId(req.user._id);
    if (!message.readBy.some(readByUserId => readByUserId.equals(userObjectId))) {
      message.readBy.push(userObjectId);
      await message.save();
    }

    sendSuccessResponse(res, 200, 'Message marked as read');
  })
};

// Notifications Controller
import { Notification } from '../models';

export const notificationController = {
  // Get user's notifications
  getNotifications: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const userId = new Types.ObjectId(req.user._id);
    const [notifications, total] = await Promise.all([
      Notification.find({ recipientId: userId })
        .populate('sourceId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments({ recipientId: userId })
    ]);

    const totalPages = Math.ceil(total / limitNum);
    sendPaginatedResponse(res, 200, 'Notifications retrieved successfully', notifications, {
      page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
    });
  }),

  // Mark notification as read
  markAsRead: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const { id } = req.params;

    const userId = new Types.ObjectId(req.user._id);
    const notification = await Notification.findOne({ _id: id, recipientId: userId });
    if (!notification) return next(new AppError('Notification not found', 404));

    notification.isRead = true;
    await notification.save();

    sendSuccessResponse(res, 200, 'Notification marked as read');
  }),

  // Mark all notifications as read
  markAllAsRead: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));

    const userId = new Types.ObjectId(req.user._id);
    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true }
    );

    sendSuccessResponse(res, 200, 'All notifications marked as read');
  })
};

// Saved Items Controller
import { SavedItem } from '../models';

export const savedController = {
  // Get user's saved items
  getSavedItems: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const { page = 1, limit = 20, entityType } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const userId = new Types.ObjectId(req.user._id);
    const query: any = { userId };
    if (entityType) query.entityType = entityType;

    const [savedItems, total] = await Promise.all([
      SavedItem.find(query)
        .populate('entityId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SavedItem.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);
    sendPaginatedResponse(res, 200, 'Saved items retrieved successfully', savedItems, {
      page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
    });
  }),

  // Save an item
  saveItem: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const { entityId, entityType } = req.body;

    const userId = new Types.ObjectId(req.user._id);
    const existing = await SavedItem.findOne({
      userId,
      entityId,
      entityType
    });

    if (existing) return next(new AppError('Item already saved', 400));

    const savedItem = await SavedItem.create({
      userId,
      entityId,
      entityType
    });

    sendSuccessResponse(res, 201, 'Item saved successfully', { savedItem });
  }),

  // Unsave an item
  unsaveItem: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const { entityId, entityType } = req.params;

    const userId = new Types.ObjectId(req.user._id);
    const result = await SavedItem.findOneAndDelete({
      userId,
      entityId,
      entityType
    });

    if (!result) return next(new AppError('Saved item not found', 404));

    sendSuccessResponse(res, 200, 'Item unsaved successfully');
  })
};

// Feed Controller
import { Project, Post, Reel } from '../models';

export const feedController = {
  // Get personalized feed
  getFeed: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // For now, return recent content from all types
    const [projects, posts, reels] = await Promise.all([
      Project.find().populate('authorId').sort({ createdAt: -1 }).limit(limitNum / 3),
      Post.find().populate('authorId').sort({ createdAt: -1 }).limit(limitNum / 3),
      Reel.find().populate('authorId').sort({ createdAt: -1 }).limit(limitNum / 3)
    ]);

    const feed = [...projects, ...posts, ...reels]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(skip, skip + limitNum);

    sendPaginatedResponse(res, 200, 'Feed retrieved successfully', feed, {
      page: pageNum, limit: limitNum, total: feed.length, totalPages: 1, hasNext: false, hasPrev: false
    });
  }),

  // Get trending content
  getTrending: catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get trending based on likes and views
    const [projects, posts, reels] = await Promise.all([
      Project.find().populate('authorId').sort({ likesCount: -1, viewsCount: -1 }).limit(limitNum / 3),
      Post.find().populate('authorId').sort({ likesCount: -1 }).limit(limitNum / 3),
      Reel.find().populate('authorId').sort({ likesCount: -1, viewsCount: -1 }).limit(limitNum / 3)
    ]);

    const trending = [...projects, ...posts, ...reels]
      .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
      .slice(skip, skip + limitNum);

    sendPaginatedResponse(res, 200, 'Trending content retrieved successfully', trending, {
      page: pageNum, limit: limitNum, total: trending.length, totalPages: 1, hasNext: false, hasPrev: false
    });
  })
};