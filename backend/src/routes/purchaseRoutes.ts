import { Router } from 'express';
import { PurchaseController } from '../controllers/purchaseController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.get('/', requirePermission('purchases.view'), PurchaseController.listPurchases);
router.post('/', requirePermission('purchases.create'), PurchaseController.createPurchase);
router.get('/:id', requirePermission('purchases.view'), PurchaseController.getPurchaseById);

export default router;
