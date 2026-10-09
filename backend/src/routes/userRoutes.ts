import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { requireAuth, requirePermission, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('users.view'), UserController.listUsers);
router.post('/', requirePermission('users.manage'), requireRole('OWNER', 'MANAGER'), UserController.createStaffUser);

export default router;
