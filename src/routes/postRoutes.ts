import { Router } from 'express';
import * as postController from '../controllers/postController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { validateBody, validateObjectId, validatePagination } from '../middleware/validation';
import { postValidation, commentValidation } from '../validation/schemas';

const router = Router();

router.get('/', validatePagination(), postController.getPosts);
router.post('/', authenticate, validateBody(postValidation.create), postController.createPost);
router.get('/:id', optionalAuthenticate, validateObjectId(), postController.getPost);
router.put('/:id', authenticate, validateObjectId(), validateBody(postValidation.update), postController.updatePost);
router.delete('/:id', authenticate, validateObjectId(), postController.deletePost);
router.post('/:id/like', authenticate, validateObjectId(), postController.likePost);
router.delete('/:id/like', authenticate, validateObjectId(), postController.unlikePost);
router.get('/:id/comments', validateObjectId(), validatePagination(), postController.getPostComments);
router.post('/:id/comments', authenticate, validateObjectId(), validateBody(commentValidation.create), postController.addPostComment);

export default router;