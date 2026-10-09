import { Router } from 'express';
import { MedicineController } from '../controllers/medicineController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

// Categories endpoints
router.get('/categories', requirePermission('products.view'), MedicineController.listCategories);
router.post('/categories', requirePermission('products.create'), MedicineController.createCategory);

// Medicines endpoints
router.get('/', requirePermission('products.view'), MedicineController.listMedicines);
router.get('/barcode/:barcode', requirePermission('products.view'), MedicineController.getMedicineByBarcode);
router.get('/:id', requirePermission('products.view'), MedicineController.getMedicineById);
router.post('/', requirePermission('products.create'), MedicineController.createMedicine);
router.put('/:id', requirePermission('products.edit'), MedicineController.updateMedicine);
router.delete('/:id', requirePermission('products.archive'), MedicineController.archiveMedicine);

export default router;
