import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.get('/', requirePermission('inventory.view'), AlertController.listAlerts);
router.get('/summary', requirePermission('inventory.view'), AlertController.getSummary);
router.put('/:id/resolve', requirePermission('inventory.adjust'), AlertController.resolveAlert);

export default router;
