import { Router } from 'express';
import { SaleController } from '../controllers/saleController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.post('/', requirePermission('sales.create'), SaleController.completeSale);
router.get('/', requirePermission('sales.view'), SaleController.listSales);
router.get('/:id', requirePermission('sales.view'), SaleController.getSaleById);

export default router;
