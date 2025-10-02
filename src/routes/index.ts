import { Router } from 'express';
import * as reelController from '../controllers/reelController';
import { messageController, notificationController, savedController, feedController } from '../controllers/index';
import { authenticate } from '../middleware/auth';
import { validateBody, validateObjectId, validatePagination } from '../middleware/validation';
import { reelValidation, commentValidation, messageValidation, genericValidation } from '../validation/schemas';

// Reel Routes
export const reelRoutes = Router();
reelRoutes.get('/', validatePagination(), reelController.getReels);
reelRoutes.post('/', authenticate, validateBody(reelValidation.create), reelController.createReel);
reelRoutes.get('/:id', validateObjectId(), reelController.getReel);
reelRoutes.put('/:id', authenticate, validateObjectId(), validateBody(reelValidation.update), reelController.updateReel);
reelRoutes.delete('/:id', authenticate, validateObjectId(), reelController.deleteReel);
reelRoutes.post('/:id/like', authenticate, validateObjectId(), reelController.likeReel);
reelRoutes.delete('/:id/like', authenticate, validateObjectId(), reelController.unlikeReel);
reelRoutes.get('/:id/comments', validateObjectId(), validatePagination(), reelController.getReelComments);
reelRoutes.post('/:id/comments', authenticate, validateObjectId(), validateBody(commentValidation.create), reelController.addReelComment);

// Message Routes
export const messageRoutes = Router();
messageRoutes.get('/conversations', authenticate, messageController.getConversations);
messageRoutes.get('/conversations/:conversationId', authenticate, validateObjectId('conversationId'), validatePagination(), messageController.getConversationMessages);
messageRoutes.post('/conversations/:userId', authenticate, validateObjectId('userId'), validateBody(messageValidation.create), messageController.sendMessage);
messageRoutes.post('/:conversationId', authenticate, validateObjectId('conversationId'), validateBody(messageValidation.create), messageController.sendMessageToConversation);
messageRoutes.patch('/:messageId/read', authenticate, validateObjectId('messageId'), messageController.markAsRead);

// Notification Routes
export const notificationRoutes = Router();
notificationRoutes.get('/', authenticate, validatePagination(), notificationController.getNotifications);
notificationRoutes.patch('/:id/read', authenticate, validateObjectId(), notificationController.markAsRead);
notificationRoutes.patch('/read-all', authenticate, notificationController.markAllAsRead);

// Saved Items Routes
export const savedRoutes = Router();
savedRoutes.get('/', authenticate, validatePagination(), savedController.getSavedItems);
savedRoutes.post('/', authenticate, validateBody(genericValidation.save), savedController.saveItem);
savedRoutes.delete('/:entityId/:entityType', authenticate, savedController.unsaveItem);

// Feed Routes
export const feedRoutes = Router();
feedRoutes.get('/', validatePagination(), feedController.getFeed);

// Trending Routes
export const trendingRoutes = Router();
trendingRoutes.get('/', validatePagination(), feedController.getTrending);