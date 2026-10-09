'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  RotateCcw,
  Plus,
  Search,
  AlertOctagon,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  DollarSign,
  ShieldCheck,
  PackageX,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SaleReturnItem {
  id: string;
  returnNumber: string;
  totalRefund: number;
  reason: string;
  createdAt: string;
  sale?: { saleNumber: string };
  cashier?: { fullName: string };
  items?: {
    id: string;
    quantity: number;
    refundAmount: number;
    condition: string;
    medicine?: { name: string };
    batch?: { batchNumber: string };
  }[];
}

interface MedicineOption {
  id: string;
  name: string;
}

interface BatchOption {
  id: string;
  batchNumber: string;
  quantity: number;
}

export default function ReturnsPage() {
  const { hasPermission } = useAuth();
  const [returnsList, setReturnsList] = useState<SaleReturnItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  // Return Form
  const [saleNumberSearch, setSaleNumberSearch] = useState('');
  const [foundSale, setFoundSale] = useState<Record<string, unknown> | null>(null);
  const [returnReason, setReturnReason] = useState('Customer returned item');
  const [returnItemsState, setReturnItemsState] = useState<
    {
      saleItemId: string;
      medicineId: string;
      medicineName: string;
      batchId: string;
      batchNumber: string;
      maxQty: number;
      unitPrice: number;
      returnQty: number;
      condition: 'SELLABLE' | 'DAMAGED' | 'QUARANTINED';
      selected: boolean;
    }[]
  >([]);

  // Damage Form
  const [dmgMedId, setDmgMedId] = useState('');
  const [dmgBatchId, setDmgBatchId] = useState('');
  const [dmgQty, setDmgQty] = useState(1);
  const [dmgReason, setDmgReason] = useState('Broken packaging during storage');
  const [dmgBatches, setDmgBatches] = useState<BatchOption[]>([]);

  // Expired Disposal Form
  const [expMedId, setExpMedId] = useState('');
  const [expBatchId, setExpBatchId] = useState('');
  const [expReason, setExpReason] = useState('Past expiration date disposal');
  const [expBatches, setExpBatches] = useState<BatchOption[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/returns');
      if (res.ok) {
        const json = await res.json();
        setReturnsList(json.data.returns);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load return records.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMedicines = useCallback(async () => {
    try {
      const res = await fetch('/api/medicines?limit=200');
      if (res.ok) {
        const json = await res.json();
        setMedicines(json.data.medicines);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchReturns();
    fetchMedicines();
  }, [fetchReturns, fetchMedicines]);

  const lookupSaleForReturn = async () => {
    if (!saleNumberSearch) return;
    setMessage(null);
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const json = await res.json();
        const sale = json.data.sales.find(
          (s: { saleNumber: string }) => s.saleNumber.toLowerCase() === saleNumberSearch.trim().toLowerCase()
        );

        if (!sale) {
          setMessage({ type: 'error', text: `Sale '${saleNumberSearch}' not found.` });
          setFoundSale(null);
          return;
        }

        // Fetch details
        const detRes = await fetch(`/api/sales/${sale.id}`);
        if (detRes.ok) {
          const detJson = await detRes.json();
          const fullSale = detJson.data.sale;
          setFoundSale(fullSale);

          const mapped = fullSale.items.map(
            (si: {
              id: string;
              medicineId: string;
              batchId: string;
              quantity: number;
              unitPrice: number;
              medicine?: { name: string };
              batch?: { batchNumber: string };
            }) => ({
              saleItemId: si.id,
              medicineId: si.medicineId,
              medicineName: si.medicine?.name || 'Medicine',
              batchId: si.batchId,
              batchNumber: si.batch?.batchNumber || 'Batch',
              maxQty: si.quantity,
              unitPrice: si.unitPrice,
              returnQty: 1,
              condition: 'SELLABLE' as const,
              selected: false,
            })
          );

          setReturnItemsState(mapped);
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Error fetching sale details.' });
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedItems = returnItemsState.filter((i) => i.selected && i.returnQty > 0);
    if (selectedItems.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one item to return.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        saleId: (foundSale as { id: string }).id,
        reason: returnReason,
        items: selectedItems.map((i) => ({
          saleItemId: i.saleItemId,
          medicineId: i.medicineId,
          batchId: i.batchId,
          quantity: i.returnQty,
          condition: i.condition,
        })),
      };

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Return failed.' });
      } else {
        setMessage({ type: 'success', text: data.message });
        setShowReturnModal(false);
        setFoundSale(null);
        fetchReturns();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error processing return.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadBatchesForDmg = async (medId: string) => {
    setDmgMedId(medId);
    if (!medId) return;
    try {
      const res = await fetch(`/api/inventory/medicines/${medId}/batches`);
      if (res.ok) {
        const json = await res.json();
        setDmgBatches(json.data.batches);
        if (json.data.batches.length > 0) {
          setDmgBatchId(json.data.batches[0].id);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  const handleDeclareDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/returns/damage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: dmgMedId,
          batchId: dmgBatchId,
          quantity: Number(dmgQty),
          reason: dmgReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Damage declaration failed.' });
      } else {
        setMessage({ type: 'success', text: data.message });
        setShowDamageModal(false);
        fetchReturns();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadBatchesForExp = async (medId: string) => {
    setExpMedId(medId);
    if (!medId) return;
    try {
      const res = await fetch(`/api/inventory/medicines/${medId}/batches`);
      if (res.ok) {
        const json = await res.json();
        setExpBatches(json.data.batches);
        if (json.data.batches.length > 0) {
          setExpBatchId(json.data.batches[0].id);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  const handleDisposeExpired = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/returns/dispose-expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: expMedId,
          batchId: expBatchId,
          reason: expReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Disposal failed.' });
      } else {
        setMessage({ type: 'success', text: data.message });
        setShowExpiredModal(false);
        fetchReturns();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalRefundedSum = returnsList.reduce((acc, r) => acc + r.totalRefund, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Returns & Controlled Adjustments</h1>
            <Badge variant="warning">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reversal Ledger
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customer sales returns (sellable vs quarantine inspection), damaged stock declarations, and expired inventory disposal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('inventory.adjust') && (
            <>
              <Button variant="secondary" size="md" onClick={() => setShowDamageModal(true)}>
                <AlertOctagon className="w-4 h-4 mr-1.5" /> Declare Damage
              </Button>
              <Button variant="secondary" size="md" onClick={() => setShowExpiredModal(true)}>
                <PackageX className="w-4 h-4 mr-1.5" /> Dispose Expired
              </Button>
            </>
          )}
          {hasPermission('sales.return') && (
            <Button variant="primary" size="md" onClick={() => setShowReturnModal(true)}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Process Customer Return
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
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Customer Refunds</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{formatCurrency(totalRefundedSum)}</div>
            <span className="text-[10px] text-slate-500">Processed returns value</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Return Transactions</span>
              <RotateCcw className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{returnsList.length} Returns</div>
            <span className="text-[10px] text-slate-500">Append-only return records</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Ledger Reversals Integrity</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">100% Immutable</div>
            <span className="text-[10px] text-emerald-400">No destructive deletions</span>
          </CardContent>
        </Card>
      </div>

      {/* Returns History Table */}
      <Card hoverEffect={false} className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-200">
          Customer Sale Returns Log & Inspection Status
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading Return Records...</div>
        ) : returnsList.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">No customer returns recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Return #</th>
                  <th className="p-3.5">Original Sale #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Refund Total</th>
                  <th className="p-3.5">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {returnsList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-3.5 pl-5 font-bold text-amber-400">{r.returnNumber}</td>
                    <td className="p-3.5 font-bold text-brand-300">{r.sale?.saleNumber || '—'}</td>
                    <td className="p-3.5 text-slate-400">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="p-3.5 font-sans font-medium text-slate-300">{r.reason}</td>
                    <td className="p-3.5 font-bold text-rose-400">{formatCurrency(r.totalRefund)}</td>
                    <td className="p-3.5 font-sans text-slate-300">{r.cashier?.fullName || 'Cashier'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Customer Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Process Customer Return</h3>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saleNumberSearch}
                  onChange={(e) => setSaleNumberSearch(e.target.value)}
                  placeholder="Enter Sale Number (e.g. SALE-2026-00001)..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none font-mono"
                />
                <Button variant="primary" size="sm" onClick={lookupSaleForReturn}>
                  Lookup Sale
                </Button>
              </div>

              {foundSale && (
                <form onSubmit={handleProcessReturn} className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="font-semibold text-slate-300">Original Sale: </span>
                    <span className="font-mono text-brand-300 font-bold">{(foundSale as { saleNumber: string }).saleNumber}</span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-200">Select Items & Inspection Condition</span>
                    {returnItemsState.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const updated = [...returnItemsState];
                            updated[idx].selected = e.target.checked;
                            setReturnItemsState(updated);
                          }}
                          className="w-4 h-4 text-brand-600 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-100 truncate">{item.medicineName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Batch: {item.batchNumber} | Sold Qty: {item.maxQty} @ ${item.unitPrice}
                          </div>
                        </div>

                        {item.selected && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={item.maxQty}
                              value={item.returnQty}
                              onChange={(e) => {
                                const updated = [...returnItemsState];
                                updated[idx].returnQty = Math.min(item.maxQty, Math.max(1, Number(e.target.value)));
                                setReturnItemsState(updated);
                              }}
                              className="w-16 px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded font-mono text-slate-100"
                            />
                            <select
                              value={item.condition}
                              onChange={(e) => {
                                const updated = [...returnItemsState];
                                updated[idx].condition = e.target.value as 'SELLABLE' | 'DAMAGED' | 'QUARANTINED';
                                setReturnItemsState(updated);
                              }}
                              className="px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100"
                            >
                              <option value="SELLABLE">SELLABLE (+Stock)</option>
                              <option value="QUARANTINED">QUARANTINED (No Stock)</option>
                              <option value="DAMAGED">DAMAGED (No Stock)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Return Reason *</label>
                    <textarea
                      required
                      rows={2}
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="e.g. Unopened box returned by customer with receipt"
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" type="button" onClick={() => setShowReturnModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Processing Reversal...' : 'Complete Sale Return'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Declare Damage Modal */}
      {showDamageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Declare Damaged Stock</h3>
              <button onClick={() => setShowDamageModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeclareDamage} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Medicine *</label>
                <select
                  required
                  value={dmgMedId}
                  onChange={(e) => loadBatchesForDmg(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none"
                >
                  <option value="">Select Medicine</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Batch *</label>
                <select
                  required
                  value={dmgBatchId}
                  onChange={(e) => setDmgBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none font-mono"
                >
                  <option value="">Select Batch</option>
                  {dmgBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch: {b.batchNumber} (Available Qty: {b.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Damaged Quantity *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={dmgQty}
                  onChange={(e) => setDmgQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Reason / Incident Note *</label>
                <textarea
                  required
                  rows={2}
                  value={dmgReason}
                  onChange={(e) => setDmgReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowDamageModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Recording...' : 'Deduct Damaged Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispose Expired Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Dispose Expired Stock Lot</h3>
              <button onClick={() => setShowExpiredModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDisposeExpired} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Medicine *</label>
                <select
                  required
                  value={expMedId}
                  onChange={(e) => loadBatchesForExp(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none"
                >
                  <option value="">Select Medicine</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select Expired Batch *</label>
                <select
                  required
                  value={expBatchId}
                  onChange={(e) => setExpBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none font-mono"
                >
                  <option value="">Select Batch</option>
                  {expBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch: {b.batchNumber} (Qty: {b.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Disposal Reason / Method *</label>
                <textarea
                  required
                  rows={2}
                  value={expReason}
                  onChange={(e) => setExpReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowExpiredModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Disposing...' : 'Confirm Expired Disposal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
