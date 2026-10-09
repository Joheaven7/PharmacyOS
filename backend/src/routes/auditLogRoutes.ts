import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLogController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.get('/', requirePermission('settings.manage'), AuditLogController.getAuditLogs);

export default router;
