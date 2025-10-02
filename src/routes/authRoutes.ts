import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userValidation } from '../validation/schemas';

const router = Router();

// Public routes
router.post('/register', 
  validateBody(userValidation.register),
  authController.register
);

router.post('/login',
  validateBody(userValidation.login),
  authController.login
);

router.post('/logout',
  authController.logout
);

// Protected routes (require authentication)
router.get('/me',
  authenticate,
  authController.getMe
);

router.put('/me',
  authenticate,
  validateBody(userValidation.updateProfile),
  authController.updateMe
);

router.patch('/me/profile-picture',
  authenticate,
  authController.updateProfilePicture
);

router.patch('/me/change-password',
  authenticate,
  authController.changePassword
);


export default router;