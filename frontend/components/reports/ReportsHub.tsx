'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Boxes,
  AlertTriangle,
  History,
  Filter,
  CheckCircle2,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatCurrency } from '@/lib/utils';

interface SalesReportData {
  summary: {
    totalSalesCount: number;
    totalItemsSold: number;
    totalSubtotal: number;
    totalDiscount: number;
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    grossProfitMargin: number;
    paymentBreakdown: {
      CASH: number;
      CARD: number;
      DIGITAL: number;
    };
  };
  sales: Array<{
    id: string;
    saleNumber: string;
    createdAt: string;
    cashierName: string;
    paymentMethod: string;
    subtotal: number;
    discount: number;
    total: number;
    cogs: number;
    grossProfit: number;
    itemsCount: number;
  }>;
}

interface InventoryReportData {
  summary: {
    totalMedicines: number;
    totalBatches: number;
    totalStockUnits: number;
    totalCostValuation: number;
    totalRetailValuation: number;
    potentialGrossProfit: number;
    lowStockCount: number;
    expiringBatchesCount: number;
  };
  lowStockList: Array<{
    medicineId: string;
    name: string;
    barcode?: string;
    sku?: string;
    totalStock: number;
    category?: string;
  }>;
  expiringBatchesList: Array<{
    medicineId: string;
    medicineName: string;
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    daysRemaining: number;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
    isExpired: boolean;
  }>;
  detailedInventory: Array<{
    medicineId: string;
    medicineName: string;
    category?: string;
    barcode?: string;
    sku?: string;
    unit: string;
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
    costValuation: number;
    retailValuation: number;
    status: string;
  }>;
}

interface StockMovementReportData {
  summary: {
    totalMovements: number;
    totalInboundUnits: number;
    totalOutboundUnits: number;
    netQuantityChange: number;
  };
  movements: Array<{
    id: string;
    createdAt: string;
    type: string;
    medicineName: string;
    barcode?: string;
    batchNumber: string;
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    userName: string;
  }>;
}

export const ReportsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'movements'>('sales');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [movementType, setMovementType] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

  // Report States
  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null);
  const [movementData, setMovementData] = useState<StockMovementReportData | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'sales') {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (paymentMethodFilter) params.append('paymentMethod', paymentMethodFilter);

        const res = await fetch(`/api/reports/sales?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setSalesData(json.data);
        }
      } else if (activeTab === 'inventory') {
        const res = await fetch(`/api/reports/inventory`);
        if (res.ok) {
          const json = await res.json();
          setInventoryData(json.data);
        }
      } else if (activeTab === 'movements') {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (movementType) params.append('type', movementType);

        const res = await fetch(`/api/reports/stock-movements?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setMovementData(json.data);
        }
      }
    } catch {
      // Non-blocking catch
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, startDate, endDate, movementType, paymentMethodFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let url = '';
      let defaultFilename = 'report.csv';

      if (activeTab === 'sales') {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (paymentMethodFilter) params.append('paymentMethod', paymentMethodFilter);
        url = `/api/reports/sales/csv?${params.toString()}`;
        defaultFilename = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (activeTab === 'inventory') {
        url = `/api/reports/inventory/csv`;
        defaultFilename = `inventory-valuation-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (activeTab === 'movements') {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (movementType) params.append('type', movementType);
        url = `/api/reports/stock-movements/csv?${params.toString()}`;
        defaultFilename = `stock-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Failed to download CSV export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950/40 to-slate-900 p-6 lg:p-8 border border-brand-500/20 shadow-glow">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="bg-emerald-950/80 text-emerald-400 border-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Executive Reporting Engine
              </Badge>
              <Badge variant="outline" className="text-slate-400 border-slate-700">
                Multi-Tenant Isolated Audit Ledger
              </Badge>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              Pharmacy Executive Reports & Analytics
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Download structured financial sales reports, stock valuation summaries, and immutable FEFO stock movement ledgers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={handleExportCSV}
              disabled={isExporting || isLoading}
              className="bg-brand-600 hover:bg-brand-500 text-white"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {isExporting ? 'Exporting CSV...' : 'Download CSV Report'}
            </Button>
          </div>
        </div>
      </div>

      {/* Report Type Tabs & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-slate-850 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'sales'
                ? 'bg-brand-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Sales & Profitability
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-brand-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" /> Stock Valuation & Risk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'movements'
                ? 'bg-brand-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Stock Movement Ledger
          </button>
        </div>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
          {activeTab !== 'inventory' && (
            <>
              <div className="flex items-center gap-1.5 bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-800 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none"
                  placeholder="Start Date"
                />
                <span className="text-slate-600">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none"
                />
              </div>

              {activeTab === 'sales' && (
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="bg-slate-850 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">All Payment Methods</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="DIGITAL">Digital</option>
                </select>
              )}

              {activeTab === 'movements' && (
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="bg-slate-850 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">All Movement Types</option>
                  <option value="PURCHASE">PURCHASE</option>
                  <option value="SALE">SALE</option>
                  <option value="RETURN">RETURN</option>
                  <option value="DAMAGE">DAMAGE</option>
                  <option value="EXPIRY">EXPIRY</option>
                  <option value="ADJUSTMENT_IN">ADJUSTMENT IN</option>
                  <option value="ADJUSTMENT_OUT">ADJUSTMENT OUT</option>
                </select>
              )}
            </>
          )}

          <button
            type="button"
            onClick={fetchReports}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content Panels */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Sales Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Total Sales Revenue</CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-slate-100 font-mono">
                  {formatCurrency(salesData?.summary.totalRevenue || 0)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>{salesData?.summary.totalSalesCount || 0} Transactions</span>
                  <span>{salesData?.summary.totalItemsSold || 0} Items Sold</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Gross Profit Margin</CardTitle>
                <TrendingUp className="w-4 h-4 text-brand-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-brand-300 font-mono">
                  {formatCurrency(salesData?.summary.grossProfit || 0)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>COGS: {formatCurrency(salesData?.summary.totalCOGS || 0)}</span>
                  <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-800">
                    {salesData?.summary.grossProfitMargin || 0}% Margin
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Gross Subtotal & Discounts</CardTitle>
                <FileText className="w-4 h-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-slate-100 font-mono">
                  {formatCurrency(salesData?.summary.totalSubtotal || 0)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Total Discount: {formatCurrency(salesData?.summary.totalDiscount || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Payment Breakdown</CardTitle>
                <Filter className="w-4 h-4 text-amber-400" />
              </CardHeader>
              <CardContent className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cash:</span>
                  <span className="text-slate-200 font-bold">
                    {formatCurrency(salesData?.summary.paymentBreakdown.CASH || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Card:</span>
                  <span className="text-slate-200 font-bold">
                    {formatCurrency(salesData?.summary.paymentBreakdown.CARD || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Digital:</span>
                  <span className="text-slate-200 font-bold">
                    {formatCurrency(salesData?.summary.paymentBreakdown.DIGITAL || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Itemized Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-100">
                Itemized Sales Transactions
              </CardTitle>
              <CardDescription>Filtered sale transactions within report period</CardDescription>
            </CardHeader>
            <CardContent>
              {salesData?.sales.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No sales recorded for the selected filter period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5">Sale #</th>
                        <th className="p-2.5">Date & Time</th>
                        <th className="p-2.5">Cashier</th>
                        <th className="p-2.5">Payment Method</th>
                        <th className="p-2.5 text-right">Items</th>
                        <th className="p-2.5 text-right">Revenue</th>
                        <th className="p-2.5 text-right">COGS</th>
                        <th className="p-2.5 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {salesData?.sales.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="p-2.5 font-sans font-bold text-brand-400">{s.saleNumber}</td>
                          <td className="p-2.5 text-slate-400">
                            {new Date(s.createdAt).toLocaleString('en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="p-2.5 font-sans text-slate-200">{s.cashierName}</td>
                          <td className="p-2.5 font-sans">
                            <Badge variant="outline" className="text-[10px]">
                              {s.paymentMethod}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-right text-slate-200">{s.itemsCount}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-400">
                            {formatCurrency(s.total)}
                          </td>
                          <td className="p-2.5 text-right text-slate-400">{formatCurrency(s.cogs)}</td>
                          <td className="p-2.5 text-right font-bold text-brand-300">
                            {formatCurrency(s.grossProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory Valuation KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Inventory Cost Valuation</CardTitle>
                <Boxes className="w-4 h-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-slate-100 font-mono">
                  {formatCurrency(inventoryData?.summary.totalCostValuation || 0)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>{inventoryData?.summary.totalStockUnits || 0} Total Units</span>
                  <span>{inventoryData?.summary.totalBatches || 0} Active Batches</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Inventory Retail Valuation</CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {formatCurrency(inventoryData?.summary.totalRetailValuation || 0)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Potential Gross Margin:</span>
                  <span className="font-bold text-brand-300">
                    {formatCurrency(inventoryData?.summary.potentialGrossProfit || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Low Stock Medicines</CardTitle>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-amber-400 font-mono">
                  {inventoryData?.summary.lowStockCount || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Medicines below threshold</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Expiring Risk Batches</CardTitle>
                <Calendar className="w-4 h-4 text-rose-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-rose-400 font-mono">
                  {inventoryData?.summary.expiringBatchesCount || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Expiring within warning cutoff</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Batch Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-100">
                Active Batch Inventory Lot Breakdown
              </CardTitle>
              <CardDescription>Individual medicine batches, expiry status, and cost vs retail value</CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryData?.detailedInventory.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No active inventory lots found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5">Medicine Name</th>
                        <th className="p-2.5">Barcode / SKU</th>
                        <th className="p-2.5">Batch #</th>
                        <th className="p-2.5">Expiry Date</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Purchase Price</th>
                        <th className="p-2.5 text-right">Selling Price</th>
                        <th className="p-2.5 text-right">Cost Valuation</th>
                        <th className="p-2.5 text-right">Retail Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {inventoryData?.detailedInventory.map((item) => (
                        <tr key={item.batchId} className="hover:bg-slate-850/60 transition-colors">
                          <td className="p-2.5 font-sans font-semibold text-slate-100">
                            {item.medicineName}
                            {item.category && (
                              <span className="ml-2 text-[10px] text-slate-400 font-normal">
                                ({item.category})
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-400">
                            {item.barcode || item.sku || '—'}
                          </td>
                          <td className="p-2.5 text-brand-400 font-sans font-bold">{item.batchNumber}</td>
                          <td className="p-2.5 text-slate-300">
                            {new Date(item.expiryDate).toISOString().split('T')[0]}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-100">{item.quantity}</td>
                          <td className="p-2.5 text-right text-slate-400">
                            {formatCurrency(item.purchasePrice)}
                          </td>
                          <td className="p-2.5 text-right text-slate-200">
                            {formatCurrency(item.sellingPrice)}
                          </td>
                          <td className="p-2.5 text-right text-cyan-400">
                            {formatCurrency(item.costValuation)}
                          </td>
                          <td className="p-2.5 text-right text-emerald-400">
                            {formatCurrency(item.retailValuation)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="space-y-6">
          {/* Stock Movements Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Total Movement Events</CardTitle>
                <History className="w-4 h-4 text-brand-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-slate-100 font-mono">
                  {movementData?.summary.totalMovements || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Recorded Stock Ledger Entries</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Inbound Stock Additions</CardTitle>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  +{movementData?.summary.totalInboundUnits || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Purchases, Returns & Adjustments In</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Outbound Stock Deductions</CardTitle>
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-rose-400 font-mono">
                  -{movementData?.summary.totalOutboundUnits || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Sales, Damage & Expiry Disposals</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-xs font-semibold text-slate-400">Net Quantity Delta</CardTitle>
                <Filter className="w-4 h-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-extrabold font-mono ${
                    (movementData?.summary.netQuantityChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(movementData?.summary.netQuantityChange || 0) >= 0 ? '+' : ''}
                  {movementData?.summary.netQuantityChange || 0}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Net Unit Inventory Flow</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Movements Ledger Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-100">
                Immutable Stock Movement Audit Ledger
              </CardTitle>
              <CardDescription>Append-only record of all stock unit transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {movementData?.movements.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No stock movements found matching filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5">Date & Time</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Medicine</th>
                        <th className="p-2.5">Batch #</th>
                        <th className="p-2.5 text-right">Qty Change</th>
                        <th className="p-2.5">Reference</th>
                        <th className="p-2.5">Reason / Note</th>
                        <th className="p-2.5">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {movementData?.movements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="p-2.5 text-slate-400">
                            {new Date(m.createdAt).toLocaleString('en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="p-2.5 font-sans">
                            <Badge
                              variant={
                                m.type === 'PURCHASE' || m.type.startsWith('RETURN')
                                  ? 'success'
                                  : m.type === 'SALE'
                                  ? 'info'
                                  : 'danger'
                              }
                              className="text-[10px]"
                            >
                              {m.type}
                            </Badge>
                          </td>
                          <td className="p-2.5 font-sans font-semibold text-slate-200">
                            {m.medicineName}
                          </td>
                          <td className="p-2.5 font-sans text-brand-400">{m.batchNumber}</td>
                          <td
                            className={`p-2.5 text-right font-bold ${
                              m.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td className="p-2.5 text-slate-400">
                            {m.referenceType ? `${m.referenceType}:${m.referenceId?.substring(0, 8)}` : '—'}
                          </td>
                          <td className="p-2.5 text-slate-400 font-sans max-w-xs truncate">
                            {m.reason || '—'}
                          </td>
                          <td className="p-2.5 font-sans text-slate-300">{m.userName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
