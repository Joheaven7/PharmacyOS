'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ShoppingCart,
  Search,
  Eye,
  Calendar,
  DollarSign,
  UserCheck,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SaleItemDetail {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  medicine?: { name: string; barcode?: string; strength?: string; dosageForm?: string };
  batch?: { batchNumber: string; expiryDate: string };
}

interface Sale {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  cashier?: { fullName: string };
  items?: SaleItemDetail[];
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const json = await res.json();
        setSales(json.data.sales);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const filteredSales = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.saleNumber.toLowerCase().includes(q) ||
      (s.cashier?.fullName && s.cashier.fullName.toLowerCase().includes(q))
    );
  });

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales History & Audit</h1>
            <Badge variant="success">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified Transactions
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical POS sales log, cashier activity audit, and exact FEFO batch allocation tracking.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Sales Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{formatCurrency(totalRevenue)}</div>
            <span className="text-[10px] text-slate-500">Cumulative processed sales</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Completed Transactions</span>
              <ShoppingCart className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{sales.length} Sales</div>
            <span className="text-[10px] text-slate-500">Atomic stock movements created</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Average Sale Value</span>
              <UserCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">
              {sales.length > 0 ? formatCurrency(totalRevenue / sales.length) : '$0.00'}
            </div>
            <span className="text-[10px] text-slate-500">Per customer order average</span>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter sales by Sale Number (SALE-2026-...) or Cashier Name..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Sales Table */}
      <Card hoverEffect={false} className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading Sales History...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">No sales recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Sale Number</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Cashier</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Items</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-3.5 pl-5 font-bold text-brand-300">{s.saleNumber}</td>
                    <td className="p-3.5 text-slate-400">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="p-3.5 font-sans font-semibold text-slate-200">{s.cashier?.fullName || 'Cashier'}</td>
                    <td className="p-3.5">
                      <Badge variant="info" className="text-[10px]">
                        {s.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-3.5">{s.items?.length || 0} item(s)</td>
                    <td className="p-3.5 font-bold text-emerald-400">{formatCurrency(s.total)}</td>
                    <td className="p-3.5 text-right pr-5 font-sans">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const res = await fetch(`/api/sales/${s.id}`);
                          if (res.ok) {
                            const json = await res.json();
                            setSelectedSale(json.data.sale);
                          }
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View Allocations
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Sale Detail & FEFO Allocation Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedSale.saleNumber}</h3>
                <p className="text-xs text-slate-400">
                  Cashier: {selectedSale.cashier?.fullName} | Payment: {selectedSale.paymentMethod}
                </p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="font-semibold text-slate-300">Exact FEFO Batch Deduction Breakdown</div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedSale.items?.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200">{item.medicine?.name}</div>
                      <div className="text-[10px] text-brand-300 font-mono">
                        Deducted Batch: {item.batch?.batchNumber} (Exp: {item.batch?.expiryDate ? new Date(item.batch.expiryDate).toISOString().split('T')[0] : '—'})
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div>{item.quantity} x ${item.unitPrice.toFixed(2)}</div>
                      <div className="font-bold text-emerald-400">{formatCurrency(item.subtotal)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between font-mono font-bold text-slate-100">
                <span>Grand Total Paid:</span>
                <span className="text-emerald-400">{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
