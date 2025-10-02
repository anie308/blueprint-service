import { Response, NextFunction } from 'express';
import { Project, Like, Comment, SavedItem, User, Studio } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { catchAsync, AppError, sendSuccessResponse, sendPaginatedResponse } from '../middleware/errorHandler';

// Get all projects with pagination, filtering, and sorting
export const getProjects = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { page = 1, limit = 20, sort = 'newest', tags, authorType, q } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const query: any = {};
  
  if (tags) {
    query.tags = { $in: (tags as string).split(',') };
  }
  
  if (authorType) {
    query.authorType = authorType;
  }
  
  if (q) {
    query.$text = { $search: q as string };
  }

  // Build sort
  let sortQuery: any = {};
  switch (sort) {
    case 'oldest':
      sortQuery = { createdAt: 1 };
      break;
    case 'popular':
      sortQuery = { likesCount: -1 };
      break;
    case 'views':
      sortQuery = { viewsCount: -1 };
      break;
    default:
      sortQuery = { createdAt: -1 };
  }

  const [projects, total] = await Promise.all([
    Project.find(query)
      .populate('authorId', 'username profilePictureUrl')
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Project.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  sendPaginatedResponse(res, 200, 'Projects retrieved successfully', projects, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  });
});

// Create a new project
export const createProject = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { title, description, coverImageUrl, mediaUrls, authorType, tags } = req.body;

  // Determine author based on authorType
  let authorId = req.user._id;
  
  if (authorType === 'Studio') {
    // Verify user owns the studio or is a member
    const studio = await Studio.findOne({
      $or: [
        { ownerId: req.user._id },
        { members: req.user._id }
      ]
    });
    
    if (!studio) {
      return next(new AppError('You must be a studio owner or member to create projects for a studio', 403));
    }
    authorId = studio._id;
  }

  const project = await Project.create({
    title,
    description,
    coverImageUrl,
    mediaUrls: mediaUrls || [],
    authorId,
    authorType,
    tags: tags || []
  });

  await project.populate('authorId', 'username profilePictureUrl name');

  sendSuccessResponse(res, 201, 'Project created successfully', { project });
});

// Get a specific project
export const getProject = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const project = await Project.findById(id)
    .populate('authorId', 'username profilePictureUrl name');

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Increment views count
  await Project.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });

  // Check if current user has liked this project
  let isLiked = false;
  if (req.user) {
    const like = await Like.findOne({
      userId: req.user._id,
      entityId: id,
      entityType: 'Project'
    });
    isLiked = !!like;
  }

  sendSuccessResponse(res, 200, 'Project retrieved successfully', {
    project,
    isLiked
  });
});

// Update a project
export const updateProject = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;
  const { title, description, mediaUrls, tags } = req.body;

  const project = await Project.findById(id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Check ownership
  const isOwner = project.authorType === 'User' 
    ? project.authorId.toString() === req.user._id
    : await Studio.findOne({
        _id: project.authorId,
        $or: [{ ownerId: req.user._id }, { members: req.user._id }]
      });

  if (!isOwner) {
    return next(new AppError('You can only update your own projects', 403));
  }

  const updatedProject = await Project.findByIdAndUpdate(
    id,
    {
      ...(title && { title }),
      ...(description && { description }),
      ...(mediaUrls && { mediaUrls }),
      ...(tags && { tags })
    },
    { new: true, runValidators: true }
  ).populate('authorId', 'username profilePictureUrl name');

  sendSuccessResponse(res, 200, 'Project updated successfully', { project: updatedProject });
});

// Delete a project
export const deleteProject = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;

  const project = await Project.findById(id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Check ownership
  const isOwner = project.authorType === 'User' 
    ? project.authorId.toString() === req.user._id
    : await Studio.findOne({
        _id: project.authorId,
        $or: [{ ownerId: req.user._id }, { members: req.user._id }]
      });

  if (!isOwner) {
    return next(new AppError('You can only delete your own projects', 403));
  }

  // Delete related data
  await Promise.all([
    Like.deleteMany({ entityId: id, entityType: 'Project' }),
    Comment.deleteMany({ entityId: id, entityType: 'Project' }),
    SavedItem.deleteMany({ entityId: id, entityType: 'Project' }),
    Project.findByIdAndDelete(id)
  ]);

  sendSuccessResponse(res, 200, 'Project deleted successfully');
});

// Like a project
export const likeProject = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;

  const project = await Project.findById(id);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Check if already liked
  const existingLike = await Like.findOne({
    userId: req.user._id,
    entityId: id,
    entityType: 'Project'
  });

  if (existingLike) {
    return next(new AppError('Project already liked', 400));
  }

  // Create like and increment count
  await Promise.all([
    Like.create({
      userId: req.user._id,
      entityId: id,
      entityType: 'Project'
    }),
    Project.findByIdAndUpdate(id, { $inc: { likesCount: 1 } })
  ]);

  sendSuccessResponse(res, 200, 'Project liked successfully');
});

// Unlike a project
export const unlikeProject = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;

  const project = await Project.findById(id);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const existingLike = await Like.findOne({
    userId: req.user._id,
    entityId: id,
    entityType: 'Project'
  });

  if (!existingLike) {
    return next(new AppError('Project not liked yet', 400));
  }

  // Remove like and decrement count
  await Promise.all([
    Like.findByIdAndDelete(existingLike._id),
    Project.findByIdAndUpdate(id, { $inc: { likesCount: -1 } })
  ]);

  sendSuccessResponse(res, 200, 'Project unliked successfully');
});

// Get project comments
export const getProjectComments = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const project = await Project.findById(id);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const [comments, total] = await Promise.all([
    Comment.find({ entityId: id, entityType: 'Project', parentId: null })
      .populate('authorId', 'username profilePictureUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Comment.countDocuments({ entityId: id, entityType: 'Project', parentId: null })
  ]);

  // Get replies for each comment
  const commentsWithReplies = await Promise.all(
    comments.map(async (comment: any) => {
      const replies = await Comment.find({ parentId: comment._id })
        .populate('authorId', 'username profilePictureUrl')
        .sort({ createdAt: 1 })
        .lean();
      return { ...comment, replies };
    })
  );

  const totalPages = Math.ceil(total / limitNum);

  sendPaginatedResponse(res, 200, 'Comments retrieved successfully', commentsWithReplies, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  });
});

// Add a comment to a project
export const addProjectComment = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;
  const { content, parentId } = req.body;

  const project = await Project.findById(id);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // If it's a reply, check if parent comment exists
  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (!parentComment || parentComment.entityId.toString() !== id) {
      return next(new AppError('Parent comment not found', 404));
    }
  }

  const comment = await Comment.create({
    content,
    authorId: req.user._id,
    entityId: id,
    entityType: 'Project',
    parentId: parentId || null
  });

  await comment.populate('authorId', 'username profilePictureUrl');

  // Increment comments count only for top-level comments
  if (!parentId) {
    await Project.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });
  }

  sendSuccessResponse(res, 201, 'Comment added successfully', { comment });
});