import { Response, NextFunction } from 'express';
import { Job, Studio, SavedItem } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { catchAsync, AppError, sendSuccessResponse, sendPaginatedResponse } from '../middleware/errorHandler';

// Get all jobs with pagination, filtering, and sorting
export const getJobs = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { page = 1, limit = 20, sort = 'newest', location, jobType, q } = req.query;
  
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const query: any = {};
  
  // Filter out expired jobs
  query.$or = [
    { expiresAt: null },
    { expiresAt: { $gt: new Date() } }
  ];
  
  if (location) {
    query.location = new RegExp(location as string, 'i');
  }
  
  if (jobType) {
    query.jobType = jobType;
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
    case 'salary':
      sortQuery = { salaryRange: 1 };
      break;
    default:
      sortQuery = { createdAt: -1 };
  }

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .populate('postedById', 'username profilePictureUrl name')
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Job.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  sendPaginatedResponse(res, 200, 'Jobs retrieved successfully', jobs, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  });
});

// Create a new job posting
export const createJob = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { title, description, location, salaryRange, jobType, postedByType, applicationLink, expiresAt } = req.body;

  // Determine poster based on postedByType
  let postedById = req.user._id;
  
  if (postedByType === 'Studio') {
    // Verify user owns the studio or is a member
    const studio = await Studio.findOne({
      $or: [
        { ownerId: req.user._id },
        { members: req.user._id }
      ]
    });
    
    if (!studio) {
      return next(new AppError('You must be a studio owner or member to post jobs for a studio', 403));
    }
    postedById = studio._id;
  }

  const job = await Job.create({
    title,
    description,
    location,
    salaryRange,
    jobType,
    postedById,
    postedByType,
    applicationLink,
    expiresAt
  });

  await job.populate('postedById', 'username profilePictureUrl name');

  sendSuccessResponse(res, 201, 'Job created successfully', { job });
});

// Get a specific job
export const getJob = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const job = await Job.findById(id)
    .populate('postedById', 'username profilePictureUrl name');

  if (!job) {
    return next(new AppError('Job not found', 404));
  }

  // Check if job is expired
  if (job.expiresAt && job.expiresAt < new Date()) {
    return next(new AppError('Job posting has expired', 410));
  }

  // Check if current user has saved this job
  let isSaved = false;
  if (req.user) {
    const saved = await SavedItem.findOne({
      userId: req.user._id,
      entityId: id,
      entityType: 'Job'
    });
    isSaved = !!saved;
  }

  sendSuccessResponse(res, 200, 'Job retrieved successfully', {
    job,
    isSaved
  });
});

// Update a job posting
export const updateJob = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;
  const { title, description, location, salaryRange, jobType, applicationLink, expiresAt } = req.body;

  const job = await Job.findById(id);

  if (!job) {
    return next(new AppError('Job not found', 404));
  }

  // Check ownership
  const isOwner = job.postedByType === 'User' 
    ? job.postedById.toString() === req.user._id
    : await Studio.findOne({
        _id: job.postedById,
        $or: [{ ownerId: req.user._id }, { members: req.user._id }]
      });

  if (!isOwner) {
    return next(new AppError('You can only update your own job postings', 403));
  }

  const updatedJob = await Job.findByIdAndUpdate(
    id,
    {
      ...(title && { title }),
      ...(description && { description }),
      ...(location && { location }),
      ...(salaryRange && { salaryRange }),
      ...(jobType && { jobType }),
      ...(applicationLink !== undefined && { applicationLink }),
      ...(expiresAt !== undefined && { expiresAt })
    },
    { new: true, runValidators: true }
  ).populate('postedById', 'username profilePictureUrl name');

  sendSuccessResponse(res, 200, 'Job updated successfully', { job: updatedJob });
});

// Delete a job posting
export const deleteJob = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { id } = req.params;

  const job = await Job.findById(id);

  if (!job) {
    return next(new AppError('Job not found', 404));
  }

  // Check ownership
  const isOwner = job.postedByType === 'User' 
    ? job.postedById.toString() === req.user._id
    : await Studio.findOne({
        _id: job.postedById,
        $or: [{ ownerId: req.user._id }, { members: req.user._id }]
      });

  if (!isOwner) {
    return next(new AppError('You can only delete your own job postings', 403));
  }

  // Delete job and related saved items
  await Promise.all([
    Job.findByIdAndDelete(id),
    SavedItem.deleteMany({ entityId: id, entityType: 'Job' })
  ]);

  sendSuccessResponse(res, 200, 'Job deleted successfully');
});