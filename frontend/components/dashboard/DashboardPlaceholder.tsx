'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Activity,
  CheckCircle,
  Clock,
  ShieldCheck,
  Server,
  Layers,
  Database,
  ArrowRight,
  PackageCheck,
  Building2,
  Lock,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  ShoppingCart,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { fetchHealthStatus, HealthResponse } from '@/lib/apiClient';
import { useAuth } from '@/lib/authContext';
import { formatCurrency } from '@/lib/utils';

interface AnalyticsOverview {
  period: string;
  sales: {
    revenue: number;
    transactionCount: number;
    itemsSold: number;
    averageTransactionValue: number;
    cashSales: number;
    cardSales: number;
    digitalSales: number;
  };
  profit: {
    salesRevenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
  };
  inventory: {
    totalUnits: number;
    inventoryCostValue: number;
    inventoryRetailValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringBatchesCount: number;
  };
}

interface TopProduct {
  medicineId: string;
  name: string;
  barcode?: string;
  totalQty: number;
  totalRevenue: number;
}

export const DashboardPlaceholder: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | '30days' | 'this_month'>('today');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ovRes, topRes] = await Promise.all([
        fetch(`/api/analytics/overview?period=${period}`),
        fetch(`/api/analytics/top-products?period=${period}&limit=5`),
      ]);

      if (ovRes.ok) {
        const json = await ovRes.json();
        setOverview(json.data.overview);
      }
      if (topRes.ok) {
        const json = await topRes.json();
        setTopProducts(json.data.topProducts);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchHealthStatus().then(setHealth);
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950/40 to-slate-900 p-6 lg:p-8 border border-brand-500/20 shadow-glow">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="bg-emerald-950/80 text-emerald-400 border-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" /> Part 10 — Real Analytics Engine
              </Badge>
              <Badge variant="info">
                <Building2 className="w-3.5 h-3.5" /> {user?.organizationName || 'Pharmacy Workspace'}
              </Badge>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              Pharmacy Business Analytics
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Real-time database aggregated metrics for sales, gross profit, inventory cost valuation, and FEFO stock health.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/pos">
              <Button variant="primary" size="md">
                <ShoppingCart className="w-4 h-4 mr-1.5" /> Open POS Terminal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Period Filter Switcher */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Reporting Period Dimension
        </span>
        <div className="flex p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
          {(['today', 'yesterday', '7days', '30days', 'this_month'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 font-semibold rounded-xl transition-all capitalize ${
                period === p ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Revenue */}
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none mb-0">
            <CardTitle className="text-xs font-semibold text-slate-400">Sales Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-extrabold text-slate-100 font-mono">
              {isLoading ? '...' : formatCurrency(overview?.sales?.revenue || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>{overview?.sales?.transactionCount || 0} Transactions</span>
              <span>Avg: {formatCurrency(overview?.sales?.averageTransactionValue || 0)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Gross Profit */}
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none mb-0">
            <CardTitle className="text-xs font-semibold text-slate-400">GROSS PROFIT</CardTitle>
            <TrendingUp className="w-4 h-4 text-brand-400" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-extrabold text-brand-300 font-mono">
              {isLoading ? '...' : formatCurrency(overview?.profit?.grossProfit || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>COGS: {formatCurrency(overview?.profit?.costOfGoodsSold || 0)}</span>
              <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-800">
                Revenue - COGS
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Cost Value */}
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none mb-0">
            <CardTitle className="text-xs font-semibold text-slate-400">Inventory Cost Valuation</CardTitle>
            <Boxes className="w-4 h-4 text-cyan-400" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-extrabold text-slate-100 font-mono">
              {isLoading ? '...' : formatCurrency(overview?.inventory?.inventoryCostValue || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>{overview?.inventory?.totalUnits || 0} Total Units</span>
              <span>Retail: {formatCurrency(overview?.inventory?.inventoryRetailValue || 0)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none mb-0">
            <CardTitle className="text-xs font-semibold text-slate-400">Inventory Alerts</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-extrabold text-amber-400 font-mono">
              {isLoading
                ? '...'
                : (overview?.inventory?.lowStockCount || 0) + (overview?.inventory?.expiringBatchesCount || 0)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>Low: {overview?.inventory?.lowStockCount || 0}</span>
              <span>Out: {overview?.inventory?.outOfStockCount || 0}</span>
              <span>Expiring: {overview?.inventory?.expiringBatchesCount || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Payment Breakdown & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-100">
              <CreditCard className="w-4 h-4 text-brand-400" /> Payment Methods Distribution
            </CardTitle>
            <CardDescription>Sales revenue broken down by payment instrument</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-2 text-slate-300">
                <Banknote className="w-4 h-4 text-emerald-400" /> Cash Sales
              </span>
              <span className="font-bold font-mono text-slate-100">
                {formatCurrency(overview?.sales?.cashSales || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-2 text-slate-300">
                <CreditCard className="w-4 h-4 text-brand-400" /> Card Sales
              </span>
              <span className="font-bold font-mono text-slate-100">
                {formatCurrency(overview?.sales?.cardSales || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-2 text-slate-300">
                <Smartphone className="w-4 h-4 text-cyan-400" /> Digital Sales
              </span>
              <span className="font-bold font-mono text-slate-100">
                {formatCurrency(overview?.sales?.digitalSales || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Products Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Top Selling Products
              </span>
              <Badge variant="outline" className="text-[10px] uppercase">
                Ranked by Revenue
              </Badge>
            </CardTitle>
            <CardDescription>Highest volume and revenue contributing medicines</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No product sales recorded for this period yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2.5">Rank & Product</th>
                      <th className="p-2.5">Barcode</th>
                      <th className="p-2.5 text-right">Units Sold</th>
                      <th className="p-2.5 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {topProducts.map((p, idx) => (
                      <tr key={p.medicineId} className="hover:bg-slate-850/60 transition-colors">
                        <td className="p-2.5 font-sans font-semibold text-slate-100 flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-brand-400">
                            #{idx + 1}
                          </span>
                          <span>{p.name}</span>
                        </td>
                        <td className="p-2.5 text-slate-400">{p.barcode || '—'}</td>
                        <td className="p-2.5 text-right font-bold text-slate-200">{p.totalQty}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">
                          {formatCurrency(p.totalRevenue)}
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
    </div>
  );
};
