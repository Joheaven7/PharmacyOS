'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Boxes,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  History,
  TrendingUp,
  AlertTriangle,
  X,
  Building2,
  Calendar,
  DollarSign,
  Tag,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MedicineInventoryItem {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  unit: string;
  barcode?: string;
  category?: { name: string };
  totalQuantity: number;
  sellableQuantity: number;
  expiredQuantity: number;
  activeBatchesCount: number;
  totalBatchesCount: number;
  earliestExpiry: string | null;
}

interface BatchItem {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  status: string;
  movements?: StockMovementItem[];
}

interface StockMovementItem {
  id: string;
  type: string;
  quantity: number;
  referenceType?: string;
  reason?: string;
  createdAt: string;
  medicine?: { name: string; barcode?: string };
  batch?: { batchNumber: string };
  user?: { fullName: string };
}

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'ledger'>('inventory');
  const [inventoryList, setInventoryList] = useState<MedicineInventoryItem[]>([]);
  const [movementsList, setMovementsList] = useState<StockMovementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Medicine & Batches Modal
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineInventoryItem | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<BatchItem[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Receive Stock Modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [recMedicineId, setRecMedicineId] = useState('');
  const [recBatchNumber, setRecBatchNumber] = useState('');
  const [recExpiryDate, setRecExpiryDate] = useState('');
  const [recQuantity, setRecQuantity] = useState(100);
  const [recPurchasePrice, setRecPurchasePrice] = useState(5.0);
  const [recSellingPrice, setRecSellingPrice] = useState(10.0);

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjMedicineId, setAdjMedicineId] = useState('');
  const [adjBatchId, setAdjBatchId] = useState('');
  const [adjDirection, setAdjDirection] = useState<'IN' | 'OUT'>('IN');
  const [adjQuantity, setAdjQuantity] = useState(10);
  const [adjReason, setAdjReason] = useState('Stock count correction');
  const [adjBatches, setAdjBatches] = useState<BatchItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/inventory?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        setInventoryList(json.data.inventory);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch inventory summary.' });
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  const fetchMovements = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/movements?limit=50');
      if (res.ok) {
        const json = await res.json();
        setMovementsList(json.data.movements);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchMovements();
  }, [fetchInventory, fetchMovements]);

  const viewBatches = async (med: MedicineInventoryItem) => {
    setSelectedMedicine(med);
    setShowBatchModal(true);
    try {
      const res = await fetch(`/api/inventory/medicines/${med.id}/batches`);
      if (res.ok) {
        const json = await res.json();
        setSelectedBatches(json.data.batches);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch batches for medicine.' });
    }
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/inventory/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: recMedicineId,
          batchNumber: recBatchNumber,
          expiryDate: recExpiryDate,
          quantity: Number(recQuantity),
          purchasePrice: Number(recPurchasePrice),
          sellingPrice: Number(recSellingPrice),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to receive stock.' });
      } else {
        setMessage({ type: 'success', text: data.message });
        setShowReceiveModal(false);
        fetchInventory();
        fetchMovements();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error receiving stock.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: adjMedicineId,
          batchId: adjBatchId,
          direction: adjDirection,
          quantity: Number(adjQuantity),
          reason: adjReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Adjustment failed.' });
      } else {
        setMessage({ type: 'success', text: data.message });
        setShowAdjustModal(false);
        fetchInventory();
        fetchMovements();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error adjusting stock.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadAdjBatches = async (medId: string) => {
    setAdjMedicineId(medId);
    if (!medId) return;
    try {
      const res = await fetch(`/api/inventory/medicines/${medId}/batches`);
      if (res.ok) {
        const json = await res.json();
        setAdjBatches(json.data.batches);
        if (json.data.batches.length > 0) {
          setAdjBatchId(json.data.batches[0].id);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  const getExpiryBadge = (dateStr: string | null) => {
    if (!dateStr) return <span className="text-slate-500">—</span>;

    const expiry = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      return <Badge variant="danger">Expired</Badge>;
    }
    if (diffDays <= 30) {
      return (
        <Badge variant="warning" className="text-[10px]">
          <AlertTriangle className="w-3 h-3 text-amber-400 mr-1" />
          Expiring in {diffDays}d
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] text-slate-300">
        <Calendar className="w-3 h-3 text-emerald-400 mr-1" />
        {expiry.toISOString().split('T')[0]}
      </Badge>
    );
  };

  // Metrics
  const totalStockUnits = inventoryList.reduce((acc, i) => acc + i.sellableQuantity, 0);
  const totalBatches = inventoryList.reduce((acc, i) => acc + i.activeBatchesCount, 0);
  const lowStockCount = inventoryList.filter((i) => i.sellableQuantity < 10).length;

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Batch Inventory & Stock Ledger</h1>
            <Badge variant="success">
              <Layers className="w-3.5 h-3.5 mr-1" /> Immutable FEFO Ledger
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track medicine batch lots, FEFO expiry consumption, stock movements, and inventory adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasPermission('inventory.adjust') && (
            <Button variant="secondary" size="md" onClick={() => setShowAdjustModal(true)}>
              <TrendingUp className="w-4 h-4 mr-2" /> Adjust Stock
            </Button>
          )}
          {hasPermission('inventory.receive') && (
            <Button variant="primary" size="md" onClick={() => setShowReceiveModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Receive Stock Batch
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs ${
            message.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Sellable Units</span>
              <Boxes className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{totalStockUnits}</div>
            <span className="text-[10px] text-slate-500">Available across all active batches</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Active FEFO Batches</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{totalBatches} Batches</div>
            <span className="text-[10px] text-slate-500">Unexpired sellable lots</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Low Stock Medicines</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{lowStockCount}</div>
            <span className="text-[10px] text-amber-400 font-medium">Below 10 unit threshold</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Ledger Audit Entries</span>
              <History className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{movementsList.length}</div>
            <span className="text-[10px] text-slate-500">Immutable StockMovement logs</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Switcher */}
      <div className="flex p-1 bg-slate-900/90 rounded-2xl border border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'inventory'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Boxes className="w-3.5 h-3.5 inline mr-1.5" /> Medicine Stock Summary
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'ledger'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5 inline mr-1.5" /> Stock Movement Audit Trail
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter inventory by medicine name or barcode..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Medicine Stock Summary Table */}
          <Card hoverEffect={false} className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading Inventory Data...</div>
            ) : inventoryList.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">No inventory records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5 pl-5">Medicine</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Sellable Stock</th>
                      <th className="p-3.5">Batches</th>
                      <th className="p-3.5">Earliest Expiry (FEFO)</th>
                      <th className="p-3.5 text-right pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {inventoryList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/60 transition-colors">
                        <td className="p-3.5 pl-5 font-semibold text-slate-100">
                          <div>{item.name}</div>
                          {item.barcode && (
                            <div className="text-[10px] text-slate-400 font-mono">Barcode: {item.barcode}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          {item.category ? (
                            <Badge variant="outline" className="text-[10px]">
                              {item.category.name}
                            </Badge>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold font-mono">
                          <span
                            className={
                              item.sellableQuantity === 0
                                ? 'text-rose-400'
                                : item.sellableQuantity < 10
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }
                          >
                            {item.sellableQuantity} {item.unit}s
                          </span>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="info" className="text-[10px]">
                            {item.activeBatchesCount} Active Lot(s)
                          </Badge>
                        </td>
                        <td className="p-3.5">{getExpiryBadge(item.earliestExpiry)}</td>
                        <td className="p-3.5 text-right pr-5">
                          <Button variant="outline" size="sm" onClick={() => viewBatches(item)}>
                            View Batches ({item.totalBatchesCount})
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Stock Movement Audit Log */
        <Card hoverEffect={false} className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 text-xs font-semibold text-slate-300">
            Immutable Stock Movement Ledger Audit Log (Append-Only)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Timestamp</th>
                  <th className="p-3.5">Movement Type</th>
                  <th className="p-3.5">Medicine</th>
                  <th className="p-3.5">Batch</th>
                  <th className="p-3.5">Quantity Change</th>
                  <th className="p-3.5">Reason / Reference</th>
                  <th className="p-3.5">Staff User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {movementsList.map((m) => {
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="p-3.5 pl-5 text-slate-400">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            m.type.includes('PURCHASE') || m.type.includes('IN')
                              ? 'success'
                              : m.type.includes('SALE')
                              ? 'info'
                              : 'danger'
                          }
                          className="text-[10px]"
                        >
                          {m.type}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-sans font-semibold text-slate-200">
                        {m.medicine?.name || '—'}
                      </td>
                      <td className="p-3.5 font-mono text-brand-300">{m.batch?.batchNumber || '—'}</td>
                      <td className="p-3.5 font-bold">
                        <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-slate-400">
                        {m.reason || m.referenceType || '—'}
                      </td>
                      <td className="p-3.5 font-sans text-slate-300">
                        {m.user?.fullName || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Batch Details Modal */}
      {showBatchModal && selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedMedicine.name}</h3>
                <p className="text-xs text-slate-400">Batches & Expiry Dates for this product</p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedBatches.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">No batches received for this medicine yet.</div>
              ) : (
                selectedBatches.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-brand-300 font-mono text-sm">
                        Batch: {b.batchNumber}
                      </span>
                      {getExpiryBadge(b.expiryDate)}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Available Quantity</span>
                        <span className="font-bold font-mono text-emerald-400">{b.quantity} units</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Purchase Cost</span>
                        <span className="font-mono">{formatCurrency(b.purchasePrice)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Selling Price</span>
                        <span className="font-mono text-brand-300">{formatCurrency(b.sellingPrice)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Receive Stock Batch</h3>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReceiveStock} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Medicine *</label>
                <select
                  required
                  value={recMedicineId}
                  onChange={(e) => setRecMedicineId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select Medicine</option>
                  {inventoryList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.barcode ? `(${m.barcode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Batch Number *</label>
                  <input
                    type="text"
                    required
                    value={recBatchNumber}
                    onChange={(e) => setRecBatchNumber(e.target.value)}
                    placeholder="e.g. BATCH-2026-A"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={recExpiryDate}
                    onChange={(e) => setRecExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={recQuantity}
                    onChange={(e) => setRecQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Purchase Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={recPurchasePrice}
                    onChange={(e) => setRecPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={recSellingPrice}
                    onChange={(e) => setRecSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowReceiveModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Receiving...' : 'Receive Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Manual Stock Adjustment</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Medicine *</label>
                <select
                  required
                  value={adjMedicineId}
                  onChange={(e) => loadAdjBatches(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select Medicine</option>
                  {inventoryList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Sellable: {m.sellableQuantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Target Batch *</label>
                <select
                  required
                  value={adjBatchId}
                  onChange={(e) => setAdjBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="">Select Batch</option>
                  {adjBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch: {b.batchNumber} (Current Qty: {b.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Adjustment Direction *</label>
                  <select
                    value={adjDirection}
                    onChange={(e) => setAdjDirection(e.target.value as 'IN' | 'OUT')}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="IN">ADD Stock (+ IN)</option>
                    <option value="OUT">DEDUCT Stock (- OUT)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={adjQuantity}
                    onChange={(e) => setAdjQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Adjustment Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Stock count audit, damage, correction"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adjusting...' : 'Perform Adjustment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
