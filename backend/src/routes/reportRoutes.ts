import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

router.use(requireAuth);
router.use(enforceTenantIsolation);

// Sales Reports
router.get('/sales', requirePermission('reports.view'), ReportController.getSalesReport);
router.get('/sales/csv', requirePermission('reports.view'), ReportController.exportSalesCSV);

// Inventory & Stock Valuation Reports
router.get('/inventory', requirePermission('reports.view'), ReportController.getInventoryReport);
router.get('/inventory/csv', requirePermission('reports.view'), ReportController.exportInventoryCSV);

// Stock Movement Ledger Reports
router.get('/stock-movements', requirePermission('reports.view'), ReportController.getStockMovementReport);
router.get('/stock-movements/csv', requirePermission('reports.view'), ReportController.exportStockMovementsCSV);

export default router;
