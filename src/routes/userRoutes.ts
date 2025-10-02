import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userValidation } from '../validation/schemas';

const router = Router();

// Get public profile by username
router.get('/:username', userController.getPublicProfile);

// Update current user's profile  
router.put('/me', authenticate, validateBody(userValidation.updateProfile), userController.updateMe);

// Update profile picture
router.patch('/me/profile-picture', authenticate, userController.updateProfilePicture);

export default router;