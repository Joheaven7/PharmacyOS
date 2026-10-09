import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.get('/', requirePermission('purchases.view'), SupplierController.listSuppliers);
router.post('/', requirePermission('purchases.create'), SupplierController.createSupplier);
router.get('/:id', requirePermission('purchases.view'), SupplierController.getSupplierById);

export default router;
