import { Router } from 'express';
import { ImportController } from '../controllers/importController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.post('/preview', requirePermission('products.create'), ImportController.previewImport);
router.post('/execute', requirePermission('products.create'), ImportController.executeImport);

export default router;
