import { Router } from 'express';
import * as studioController from '../controllers/studioController';
import { authenticate } from '../middleware/auth';
import { validateBody, validateObjectId, validatePagination, validateSearch } from '../middleware/validation';
import { studioValidation } from '../validation/schemas';

const router = Router();

// Get all studios
router.get('/',
  validateSearch(),
  studioController.getStudios
);

// Create a new studio
router.post('/',
  authenticate,
  validateBody(studioValidation.create),
  studioController.createStudio
);

// Get a specific studio
router.get('/:id',
  validateObjectId(),
  studioController.getStudio
);

// Update a studio
router.put('/:id',
  authenticate,
  validateObjectId(),
  validateBody(studioValidation.update),
  studioController.updateStudio
);

// Delete a studio
router.delete('/:id',
  authenticate,
  validateObjectId(),
  studioController.deleteStudio
);

// Get studio members
router.get('/:id/members',
  validateObjectId(),
  studioController.getStudioMembers
);

// Add a member to a studio
router.post('/:id/members',
  authenticate,
  validateObjectId(),
  studioController.addStudioMember
);

// Remove a member from a studio
router.delete('/:id/members/:userId',
  authenticate,
  validateObjectId(),
  studioController.removeStudioMember
);

// Get jobs posted by a studio
router.get('/:id/jobs',
  validateObjectId(),
  validatePagination(),
  studioController.getStudioJobs
);

// Get projects by a studio
router.get('/:id/projects',
  validateObjectId(),
  validatePagination(),
  studioController.getStudioProjects
);

export default router;