import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import organizationRoutes from './organizationRoutes';
import medicineRoutes from './medicineRoutes';
import inventoryRoutes from './inventoryRoutes';
import supplierRoutes from './supplierRoutes';
import purchaseRoutes from './purchaseRoutes';
import saleRoutes from './saleRoutes';
import returnRoutes from './returnRoutes';
import alertRoutes from './alertRoutes';
import analyticsRoutes from './analyticsRoutes';
import reportRoutes from './reportRoutes';
import auditLogRoutes from './auditLogRoutes';
import importRoutes from './importRoutes';

const router = Router();

// Health routes
router.use('/', healthRoutes);
router.use('/api', healthRoutes);

// Auth, User, Organization, Medicine, Inventory, Supplier, Purchase, Sale, Return, Alert, Analytics, Report, AuditLog, & Import routes
router.use('/api/auth', authRoutes);
router.use('/api/users', userRoutes);
router.use('/api/organization', organizationRoutes);
router.use('/api/medicines', medicineRoutes);
router.use('/api/inventory', inventoryRoutes);
router.use('/api/suppliers', supplierRoutes);
router.use('/api/purchases', purchaseRoutes);
router.use('/api/sales', saleRoutes);
router.use('/api/returns', returnRoutes);
router.use('/api/alerts', alertRoutes);
router.use('/api/analytics', analyticsRoutes);
router.use('/api/reports', reportRoutes);
router.use('/api/audit-logs', auditLogRoutes);
router.use('/api/import', importRoutes);

export default router;
