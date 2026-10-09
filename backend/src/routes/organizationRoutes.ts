import { Router } from 'express';
import { OrganizationController } from '../controllers/organizationController';
import { requireAuth, requirePermission, requireRole } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.get('/profile', requirePermission('settings.view'), OrganizationController.getProfile);
router.put(
  '/profile',
  requirePermission('settings.manage'),
  requireRole('OWNER', 'MANAGER'),
  OrganizationController.updateProfile
);

export default router;
