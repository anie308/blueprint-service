import { Response, NextFunction } from 'express';
import { User } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { catchAsync, AppError, sendSuccessResponse } from '../middleware/errorHandler';

// Get public profile of a user by username
export const getPublicProfile = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { username } = req.params;
  const user = await User.findOne({ username });
  if (!user) return next(new AppError('User not found', 404));

  const publicProfile = {
    id: user._id,
    username: user.username,
    profilePictureUrl: user.profilePictureUrl,
    bio: user.bio,
    location: user.location,
    website: user.website,
    socialLinks: user.socialLinks,
    subscriptionTier: user.subscriptionTier,
    createdAt: user.createdAt
  };

  sendSuccessResponse(res, 200, 'User profile retrieved successfully', { user: publicProfile });
});

// Update current authenticated user's profile
export const updateMe = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));

  const { username, bio, location, website, socialLinks } = req.body;

  // Ensure username uniqueness
  if (username && username !== req.user.username) {
    const exists = await User.findOne({ username });
    if (exists) return next(new AppError('Username already taken', 400));
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { ...(username && { username }), ...(bio !== undefined && { bio }), ...(location !== undefined && { location }), ...(website !== undefined && { website }), ...(socialLinks && { socialLinks }) },
    { new: true, runValidators: true }
  );

  sendSuccessResponse(res, 200, 'Profile updated successfully', { user: updated?.toJSON() });
});

// Update profile picture
export const updateProfilePicture = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  const { profilePictureUrl } = req.body;
  if (!profilePictureUrl) return next(new AppError('Profile picture URL is required', 400));

  const updated = await User.findByIdAndUpdate(req.user._id, { profilePictureUrl }, { new: true, runValidators: true });
  sendSuccessResponse(res, 200, 'Profile picture updated successfully', { user: updated?.toJSON() });
});
