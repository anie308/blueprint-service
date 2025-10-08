import { Response, NextFunction } from 'express';
import { Studio, Project, Job, User } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { catchAsync, AppError, sendSuccessResponse, sendPaginatedResponse } from '../middleware/errorHandler';
import { Types } from 'mongoose';

// Get all studios with pagination and filtering
export const getStudios = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { page = 1, limit = 20, sort = 'newest', location, q } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const query: any = {};
  
  if (location) {
    query.location = new RegExp(location as string, 'i');
  }
  
  if (q) {
    query.$or = [
      { name: new RegExp(q as string, 'i') },
      { description: new RegExp(q as string, 'i') }
    ];
  }

  // Build sort
  let sortQuery: any = { createdAt: -1 };
  if (sort === 'oldest') {
    sortQuery = { createdAt: 1 };
  } else if (sort === 'name') {
    sortQuery = { name: 1 };
  }

  const [studios, total] = await Promise.all([
    Studio.find(query)
      .populate('ownerId', 'username profilePictureUrl')
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Studio.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  sendPaginatedResponse(res, 200, 'Studios retrieved successfully', studios, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  });
});

// Create a new studio
export const createStudio = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { name, description, slug, website, isPrivate, studioRules, category } = req.body;

  const studio = await Studio.create({
    name,
    description,
    website,
    private: isPrivate,
    studioRules,
    category,
    slug,
    ownerId: req.user._id,
    members: [req.user._id] // Owner is automatically a member
  });

  await studio.populate('ownerId', 'username profilePictureUrl');

  sendSuccessResponse(res, 201, 'Studio created successfully', { studio });
});

// Get a specific studio
export const getStudio = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const studio = await Studio.findById(id)
    .populate('ownerId', 'username profilePictureUrl')
    .populate('members', 'username profilePictureUrl');

  if (!studio) {
    return next(new AppError('Studio not found', 404));
  }

  sendSuccessResponse(res, 200, 'Studio retrieved successfully', { studio });
});

// Update a studio
export const updateStudio = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;
  const { name, description, location, website } = req.body;

  const studio = await Studio.findById(id);

  if (!studio) {
    return next(new AppError('Studio not found', 404));
  }

  // Check if user is the owner
  if (studio.ownerId.toString() !== req.user._id) {
    return next(new AppError('Only studio owner can update studio details', 403));
  }

  const updatedStudio = await Studio.findByIdAndUpdate(
    id,
    {
      ...(name && { name }),
      ...(description && { description }),
      ...(location && { location }),
      ...(website !== undefined && { website })
    },
    { new: true, runValidators: true }
  ).populate('ownerId', 'username profilePictureUrl');

  sendSuccessResponse(res, 200, 'Studio updated successfully', { studio: updatedStudio });
});

// Delete a studio
export const deleteStudio = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;

  const studio = await Studio.findById(id);

  if (!studio) {
    return next(new AppError('Studio not found', 404));
  }

  // Check if user is the owner
  if (studio.ownerId.toString() !== req.user._id) {
    return next(new AppError('Only studio owner can delete the studio', 403));
  }

  // Delete studio and related data
  await Promise.all([
    Studio.findByIdAndDelete(id),
    Project.deleteMany({ authorId: id, authorType: 'Studio' }),
    Job.deleteMany({ postedById: id, postedByType: 'Studio' })
  ]);

  sendSuccessResponse(res, 200, 'Studio deleted successfully');
});

// Get studio members
export const getStudioMembers = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const studio = await Studio.findById(id)
    .populate('members', 'username profilePictureUrl bio location')
    .populate('ownerId', 'username profilePictureUrl bio location');

  if (!studio) {
    return next(new AppError('Studio not found', 404));
  }

  sendSuccessResponse(res, 200, 'Studio members retrieved successfully', {
    owner: studio.ownerId,
    members: studio.members
  });
});

// Add a member to a studio
export const addStudioMember = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const studio = await Studio.findById(id);

  if (!studio) {
    return next(new AppError('Studio not found', 404));
  }

  // Check if user is the owner
  if (studio.ownerId.toString() !== req.user._id) {
    return next(new AppError('Only studio owner can add members', 403));
  }

  // Check if user to be added exists
  const userToAdd = await User.findById(userId);
  if (!userToAdd) {
    return next(new AppError('User not found', 404));
  }

  const userObjectId = new Types.ObjectId(userId);
  // Check if user is already a member
  if (studio.members.some(member => member.equals(userObjectId))) {
    return next(new AppError('User is already a member of this studio', 400));
  }

  // Add member
  studio.members.push(userObjectId);
  await studio.save();

  await studio.populate('members', 'username profilePictureUrl');

  sendSuccessResponse(res, 200, 'Member added successfully', { studio });
});

// Remove a member from a studio
export const removeStudioMember = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id, userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const studio = await Studio.findById(id);

  if (!studio) {
    return next(new AppError('Studio not found', 404));
  }

  // Check if user is the owner
  if (studio.ownerId.toString() !== req.user._id) {
    return next(new AppError('Only studio owner can remove members', 403));
  }

  // Cannot remove the owner
  if (userId === studio.ownerId.toString()) {
    return next(new AppError('Cannot remove studio owner', 400));
  }

  const userObjectId = new Types.ObjectId(userId);
  // Check if user is a member
  if (!studio.members.some(member => member.equals(userObjectId))) {
    return next(new AppError('User is not a member of this studio', 400));
  }

  // Remove member
  studio.members = studio.members.filter(memberId => !memberId.equals(userObjectId));
  await studio.save();

  sendSuccessResponse(res, 200, 'Member removed successfully');
});

// Get jobs posted by a studio
export const getStudioJobs = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const studio = await Studio.findById(id);
  if (!studio) {
    return next(new AppError('Studio not found', 404));
  }

  const [jobs, total] = await Promise.all([
    Job.find({ postedById: id, postedByType: 'Studio' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Job.countDocuments({ postedById: id, postedByType: 'Studio' })
  ]);

  const totalPages = Math.ceil(total / limitNum);

  sendPaginatedResponse(res, 200, 'Studio jobs retrieved successfully', jobs, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  });
});

// Get projects by a studio
export const getStudioProjects = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const studio = await Studio.findById(id);
  if (!studio) {
    return next(new AppError('Studio not found', 404));
  }

  const [projects, total] = await Promise.all([
    Project.find({ authorId: id, authorType: 'Studio' })
      .populate('authorId', 'name logoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Project.countDocuments({ authorId: id, authorType: 'Studio' })
  ]);

  const totalPages = Math.ceil(total / limitNum);

  sendPaginatedResponse(res, 200, 'Studio projects retrieved successfully', projects, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  });
});