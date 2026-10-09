import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

router.get('/', requirePermission('inventory.view'), InventoryController.getSummary);
router.get('/medicines/:medicineId/batches', requirePermission('inventory.view'), InventoryController.getBatches);
router.get('/movements', requirePermission('inventory.view'), InventoryController.getMovements);
router.post('/receive', requirePermission('inventory.receive'), InventoryController.receiveStock);
router.post('/adjust', requirePermission('inventory.adjust'), InventoryController.adjustStock);

export default router;
