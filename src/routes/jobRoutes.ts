import { Router } from 'express';
import * as jobController from '../controllers/jobController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { validateBody, validateObjectId, validateSearch } from '../middleware/validation';
import { jobValidation } from '../validation/schemas';

const router = Router();

// Get all jobs
router.get('/',
  validateSearch(),
  jobController.getJobs
);

// Create a new job posting
router.post('/',
  authenticate,
  validateBody(jobValidation.create),
  jobController.createJob
);

// Get a specific job
router.get('/:id',
  optionalAuthenticate,
  validateObjectId(),
  jobController.getJob
);

// Update a job posting
router.put('/:id',
  authenticate,
  validateObjectId(),
  validateBody(jobValidation.update),
  jobController.updateJob
);

// Delete a job posting
router.delete('/:id',
  authenticate,
  validateObjectId(),
  jobController.deleteJob
);

export default router;