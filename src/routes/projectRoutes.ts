import { Router } from 'express';
import * as projectController from '../controllers/projectController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { validateBody, validateObjectId, validatePagination, validateSearch } from '../middleware/validation';
import { projectValidation, commentValidation } from '../validation/schemas';

const router = Router();

// Get all projects (with optional authentication for personalization)
router.get('/',
  optionalAuthenticate,
  validateSearch(),
  projectController.getProjects
);

// Create a new project
router.post('/',
  authenticate,
  validateBody(projectValidation.create),
  projectController.createProject
);

// Get a specific project
router.get('/:id',
  optionalAuthenticate,
  validateObjectId(),
  projectController.getProject
);

// Update a project
router.put('/:id',
  authenticate,
  validateObjectId(),
  validateBody(projectValidation.update),
  projectController.updateProject
);

// Delete a project
router.delete('/:id',
  authenticate,
  validateObjectId(),
  projectController.deleteProject
);

// Like a project
router.post('/:id/like',
  authenticate,
  validateObjectId(),
  projectController.likeProject
);

// Unlike a project
router.delete('/:id/like',
  authenticate,
  validateObjectId(),
  projectController.unlikeProject
);

// Get project comments
router.get('/:id/comments',
  validateObjectId(),
  validatePagination(),
  projectController.getProjectComments
);

// Add a comment to a project
router.post('/:id/comments',
  authenticate,
  validateObjectId(),
  validateBody(commentValidation.create),
  projectController.addProjectComment
);

export default router;