import { Response, NextFunction } from 'express';
import { Reel, Like, Comment, SavedItem } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { catchAsync, AppError, sendSuccessResponse, sendPaginatedResponse } from '../middleware/errorHandler';

// Get all reels
export const getReels = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { page = 1, limit = 20, sort = 'newest' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  let sortQuery: any = { createdAt: -1 };
  if (sort === 'oldest') sortQuery = { createdAt: 1 };
  else if (sort === 'popular') sortQuery = { likesCount: -1 };
  else if (sort === 'views') sortQuery = { viewsCount: -1 };

  const [reels, total] = await Promise.all([
    Reel.find().populate('authorId', 'username profilePictureUrl').sort(sortQuery).skip(skip).limit(limitNum).lean(),
    Reel.countDocuments()
  ]);

  const totalPages = Math.ceil(total / limitNum);
  sendPaginatedResponse(res, 200, 'Reels retrieved successfully', reels, {
    page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
  });
});

// Create a new reel
export const createReel = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { title, videoUrl, thumbnailUrl, description } = req.body;
  const reel = await Reel.create({ title, videoUrl, thumbnailUrl, description, authorId: req.user._id });
  await reel.populate('authorId', 'username profilePictureUrl');
  sendSuccessResponse(res, 201, 'Reel created successfully', { reel });
});

// Get a specific reel
export const getReel = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const reel = await Reel.findById(id).populate('authorId', 'username profilePictureUrl');
  if (!reel) return next(new AppError('Reel not found', 404));
  
  // Increment views
  await Reel.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });
  
  let isLiked = false;
  if (req.user) {
    const like = await Like.findOne({ userId: req.user._id, entityId: id, entityType: 'Reel' });
    isLiked = !!like;
  }
  sendSuccessResponse(res, 200, 'Reel retrieved successfully', { reel, isLiked });
});

// Update a reel
export const updateReel = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  const { title, description } = req.body;
  
  const reel = await Reel.findById(id);
  if (!reel) return next(new AppError('Reel not found', 404));
  if (reel.authorId.toString() !== req.user._id) return next(new AppError('You can only update your own reels', 403));
  
  const updated = await Reel.findByIdAndUpdate(id, { title, description }, { new: true, runValidators: true }).populate('authorId', 'username profilePictureUrl');
  sendSuccessResponse(res, 200, 'Reel updated successfully', { reel: updated });
});

// Delete a reel
export const deleteReel = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  
  const reel = await Reel.findById(id);
  if (!reel) return next(new AppError('Reel not found', 404));
  if (reel.authorId.toString() !== req.user._id) return next(new AppError('You can only delete your own reels', 403));
  
  await Promise.all([
    Like.deleteMany({ entityId: id, entityType: 'Reel' }),
    Comment.deleteMany({ entityId: id, entityType: 'Reel' }),
    SavedItem.deleteMany({ entityId: id, entityType: 'Reel' }),
    Reel.findByIdAndDelete(id)
  ]);
  sendSuccessResponse(res, 200, 'Reel deleted successfully');
});

// Like a reel
export const likeReel = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  
  const reel = await Reel.findById(id);
  if (!reel) return next(new AppError('Reel not found', 404));
  
  const existing = await Like.findOne({ userId: req.user._id, entityId: id, entityType: 'Reel' });
  if (existing) return next(new AppError('Reel already liked', 400));
  
  await Promise.all([
    Like.create({ userId: req.user._id, entityId: id, entityType: 'Reel' }),
    Reel.findByIdAndUpdate(id, { $inc: { likesCount: 1 } })
  ]);
  sendSuccessResponse(res, 200, 'Reel liked successfully');
});

// Unlike a reel
export const unlikeReel = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  
  const existing = await Like.findOne({ userId: req.user._id, entityId: id, entityType: 'Reel' });
  if (!existing) return next(new AppError('Reel not liked yet', 400));
  
  await Promise.all([
    Like.findByIdAndDelete(existing._id),
    Reel.findByIdAndUpdate(id, { $inc: { likesCount: -1 } })
  ]);
  sendSuccessResponse(res, 200, 'Reel unliked successfully');
});

// Get reel comments
export const getReelComments = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const reel = await Reel.findById(id);
  if (!reel) return next(new AppError('Reel not found', 404));

  const [comments, total] = await Promise.all([
    Comment.find({ entityId: id, entityType: 'Reel', parentId: null })
      .populate('authorId', 'username profilePictureUrl')
      .sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Comment.countDocuments({ entityId: id, entityType: 'Reel', parentId: null })
  ]);

  const commentsWithReplies = await Promise.all(
    comments.map(async (comment: any) => {
      const replies = await Comment.find({ parentId: comment._id })
        .populate('authorId', 'username profilePictureUrl').sort({ createdAt: 1 }).lean();
      return { ...comment, replies };
    })
  );

  const totalPages = Math.ceil(total / limitNum);
  sendPaginatedResponse(res, 200, 'Comments retrieved successfully', commentsWithReplies, {
    page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
  });
});

// Add a comment to a reel
export const addReelComment = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  const { content, parentId } = req.body;

  const reel = await Reel.findById(id);
  if (!reel) return next(new AppError('Reel not found', 404));

  if (parentId) {
    const parent = await Comment.findById(parentId);
    if (!parent || parent.entityId.toString() !== id) return next(new AppError('Parent comment not found', 404));
  }

  const comment = await Comment.create({
    content, authorId: req.user._id, entityId: id, entityType: 'Reel', parentId: parentId || null
  });
  await comment.populate('authorId', 'username profilePictureUrl');

  if (!parentId) {
    await Reel.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });
  }
  sendSuccessResponse(res, 201, 'Comment added successfully', { comment });
});