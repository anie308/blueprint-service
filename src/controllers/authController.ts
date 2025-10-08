import { Response, NextFunction } from 'express';
import { User, IUser } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { catchAsync, AppError, sendSuccessResponse } from '../middleware/errorHandler';

// Register new user
export const register = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { username, email, password, fullName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    return next(new AppError('User with this email or username already exists', 400));
  }

  // Create new user
  const user = await User.create({
    username,
    email,
    fullName,
    passwordHash: password // Will be hashed by pre-save middleware
  });

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  sendSuccessResponse(res, 201, 'User registered successfully', {
    user: user.toJSON(),
    token
  });
});

// Login user
export const login = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  sendSuccessResponse(res, 200, 'Login successful', {
    user: user.toJSON(),
    token
  });
});

// Logout user
export const logout = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Clear refresh token cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0)
  });

  sendSuccessResponse(res, 200, 'Logout successful');
});

// Get current user profile
export const getMe = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  sendSuccessResponse(res, 200, 'User profile retrieved successfully', {
    user: req.user.toJSON()
  });
});

// Update current user profile
export const updateMe = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { username, bio, location, website, socialLinks, fullName } = req.body;

  // Check if username is already taken by another user
  if (username && username !== req.user.username) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return next(new AppError('Username already taken', 400));
    }
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      ...(username && { username }),
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(website !== undefined && { website }),
      ...(socialLinks && { socialLinks }),
      ...(fullName !== undefined && { fullName })
    },
    {
      new: true,
      runValidators: true
    }
  );

  sendSuccessResponse(res, 200, 'Profile updated successfully', {
    user: updatedUser?.toJSON()
  });
});

// Update profile picture
export const updateProfilePicture = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { profilePictureUrl } = req.body;

  if (!profilePictureUrl) {
    return next(new AppError('Profile picture URL is required', 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { profilePictureUrl },
    { new: true, runValidators: true }
  );

  sendSuccessResponse(res, 200, 'Profile picture updated successfully', {
    user: updatedUser?.toJSON()
  });
});

// Get public user profile
export const getUserProfile = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { username } = req.params;

  const user = await User.findOne({ username });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Return public profile information
  const publicProfile = {
    id: user._id,
    username: user.username,
    profilePictureUrl: user.profilePictureUrl,
    bio: user.bio,
    location: user.location,
    website: user.website,
    socialLinks: user.socialLinks,
    subscriptionTier: user.subscriptionTier,
    fullName: user.fullName,
    createdAt: user.createdAt
  };

  sendSuccessResponse(res, 200, 'User profile retrieved successfully', {
    user: publicProfile
  });
});

// Change password
export const changePassword = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Current password and new password are required', 400));
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+passwordHash');

  if (!user || !(await user.matchPassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 400));
  }

  // Update password
  user.passwordHash = newPassword; // Will be hashed by pre-save middleware
  await user.save();

  sendSuccessResponse(res, 200, 'Password changed successfully');
});