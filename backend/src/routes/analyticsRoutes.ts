import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.get('/overview', requirePermission('reports.view'), AnalyticsController.getOverview);
router.get('/top-products', requirePermission('reports.view'), AnalyticsController.getTopProducts);

export default router;
