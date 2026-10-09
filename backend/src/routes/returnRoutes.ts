import { Router } from 'express';
import { ReturnController } from '../controllers/returnController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.post('/', requirePermission('sales.return'), ReturnController.processReturn);
router.get('/', requirePermission('sales.view'), ReturnController.listReturns);
router.post('/damage', requirePermission('inventory.adjust'), ReturnController.declareDamage);
router.post('/dispose-expired', requirePermission('inventory.adjust'), ReturnController.disposeExpired);

export default router;
