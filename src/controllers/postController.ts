import { Response, NextFunction } from 'express';
import { Post, Like, Comment, SavedItem } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { catchAsync, AppError, sendSuccessResponse, sendPaginatedResponse } from '../middleware/errorHandler';

// Get all posts
export const getPosts = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { page = 1, limit = 20, sort = 'newest' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  let sortQuery: any = { createdAt: -1 };
  if (sort === 'oldest') sortQuery = { createdAt: 1 };
  else if (sort === 'popular') sortQuery = { likesCount: -1 };

  const [posts, total] = await Promise.all([
    Post.find().populate('authorId', 'username profilePictureUrl fullName').sort(sortQuery).skip(skip).limit(limitNum).lean(),
    Post.countDocuments()
  ]);

  const totalPages = Math.ceil(total / limitNum);
  sendPaginatedResponse(res, 200, 'Posts retrieved successfully', posts, {
    page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
  });
});

// Create a new post
export const createPost = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { content, mediaUrl } = req.body;
  const post = await Post.create({ content, mediaUrl, authorId: req.user._id });
  await post.populate('authorId', 'username profilePictureUrl');
  sendSuccessResponse(res, 201, 'Post created successfully', { post });
});

// Get a specific post
export const getPost = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const post = await Post.findById(id).populate('authorId', 'username fullName profilePictureUrl');
  if (!post) return next(new AppError('Post not found', 404));
  
  let isLiked = false;
  if (req.user) {
    const like = await Like.findOne({ userId: req.user._id, entityId: id, entityType: 'Post' });
    isLiked = !!like;
  }
  sendSuccessResponse(res, 200, 'Post retrieved successfully', { post, isLiked });
});

export const getPostsByStudio = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const posts = await Post.find({ studioId: id }).populate('authorId', 'username profilePictureUrl fullName').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean();
  const total = await Post.countDocuments({ studioId: id });
  const totalPages = Math.ceil(total / limitNum);
  sendPaginatedResponse(res, 200, 'Posts retrieved successfully', posts, {
    page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1
  });
});


// Update a post
export const updatePost = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  const { content } = req.body;
  
  const post = await Post.findById(id);
  if (!post) return next(new AppError('Post not found', 404));
  if (post.authorId.toString() !== req.user._id) return next(new AppError('You can only update your own posts', 403));
  
  const updated = await Post.findByIdAndUpdate(id, { content }, { new: true, runValidators: true }).populate('authorId', 'username profilePictureUrl');
  sendSuccessResponse(res, 200, 'Post updated successfully', { post: updated });
});

// Delete a post
export const deletePost = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  
  const post = await Post.findById(id);
  if (!post) return next(new AppError('Post not found', 404));
  if (post.authorId.toString() !== req.user._id) return next(new AppError('You can only delete your own posts', 403));
  
  await Promise.all([
    Like.deleteMany({ entityId: id, entityType: 'Post' }),
    Comment.deleteMany({ entityId: id, entityType: 'Post' }),
    SavedItem.deleteMany({ entityId: id, entityType: 'Post' }),
    Post.findByIdAndDelete(id)
  ]);
  sendSuccessResponse(res, 200, 'Post deleted successfully');
});

// Like a post
export const likePost = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  
  const post = await Post.findById(id);
  if (!post) return next(new AppError('Post not found', 404));
  
  const existing = await Like.findOne({ userId: req.user._id, entityId: id, entityType: 'Post' });
  if (existing) return next(new AppError('Post already liked', 400));
  
  await Promise.all([
    Like.create({ userId: req.user._id, entityId: id, entityType: 'Post' }),
    Post.findByIdAndUpdate(id, { $inc: { likesCount: 1 } })
  ]);
  sendSuccessResponse(res, 200, 'Post liked successfully');
});

// Unlike a post
export const unlikePost = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  
  const existing = await Like.findOne({ userId: req.user._id, entityId: id, entityType: 'Post' });
  if (!existing) return next(new AppError('Post not liked yet', 400));
  
  await Promise.all([
    Like.findByIdAndDelete(existing._id),
    Post.findByIdAndUpdate(id, { $inc: { likesCount: -1 } })
  ]);
  sendSuccessResponse(res, 200, 'Post unliked successfully');
});

// Get post comments
export const getPostComments = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const post = await Post.findById(id);
  if (!post) return next(new AppError('Post not found', 404));

  const [comments, total] = await Promise.all([
    Comment.find({ entityId: id, entityType: 'Post', parentId: null })
      .populate('authorId', 'username profilePictureUrl')
      .sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Comment.countDocuments({ entityId: id, entityType: 'Post', parentId: null })
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

// Add a comment to a post
export const addPostComment = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { id } = req.params;
  const { content, parentId } = req.body;

  const post = await Post.findById(id);
  if (!post) return next(new AppError('Post not found', 404));

  if (parentId) {
    const parent = await Comment.findById(parentId);
    if (!parent || parent.entityId.toString() !== id) return next(new AppError('Parent comment not found', 404));
  }

  const comment = await Comment.create({
    content, authorId: req.user._id, entityId: id, entityType: 'Post', parentId: parentId || null
  });
  await comment.populate('authorId', 'username profilePictureUrl');

  if (!parentId) {
    await Post.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });
  }
  sendSuccessResponse(res, 201, 'Comment added successfully', { comment });
});