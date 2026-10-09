'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Truck,
  Plus,
  Search,
  Building2,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  X,
  Trash2,
  PackageCheck,
  Eye,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  active: boolean;
}

interface MedicineOption {
  id: string;
  name: string;
  barcode?: string;
}

interface PurchaseItemRow {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
}

interface Purchase {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  supplier?: { id: string; name: string };
  createdBy?: { fullName: string };
  items?: {
    id: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
    subtotal: number;
    medicine?: { name: string; barcode?: string };
  }[];
}

export default function PurchasingPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Supplier Form
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Purchase Invoice Form
  const [purSupplierId, setPurSupplierId] = useState('');
  const [purInvoiceNumber, setPurInvoiceNumber] = useState('');
  const [purPurchaseDate, setPurPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purDiscount, setPurDiscount] = useState(0);
  const [purItems, setPurItems] = useState<PurchaseItemRow[]>([
    {
      medicineId: '',
      batchNumber: '',
      expiryDate: new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0],
      quantity: 100,
      purchasePrice: 2.5,
      sellingPrice: 5.0,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const json = await res.json();
        setSuppliers(json.data.suppliers);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/purchases');
      if (res.ok) {
        const json = await res.json();
        setPurchases(json.data.purchases);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load purchase invoices.' });
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
    fetchSuppliers();
    fetchPurchases();
    fetchMedicines();
  }, [fetchSuppliers, fetchPurchases, fetchMedicines]);

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supName,
          contactPerson: supContact,
          phone: supPhone,
          email: supEmail,
          address: supAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to create supplier.' });
      } else {
        setMessage({ type: 'success', text: `Supplier '${supName}' created successfully.` });
        setShowSupplierModal(false);
        setSupName('');
        setSupContact('');
        setSupPhone('');
        setSupEmail('');
        setSupAddress('');
        fetchSuppliers();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error creating supplier.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItemRow = () => {
    setPurItems([
      ...purItems,
      {
        medicineId: '',
        batchNumber: '',
        expiryDate: new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0],
        quantity: 100,
        purchasePrice: 2.5,
        sellingPrice: 5.0,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (purItems.length === 1) return;
    setPurItems(purItems.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: keyof PurchaseItemRow, value: unknown) => {
    const updated = [...purItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setPurItems(updated);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: purSupplierId,
          invoiceNumber: purInvoiceNumber,
          purchaseDate: purPurchaseDate,
          discount: Number(purDiscount),
          items: purItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to receive purchase.' });
      } else {
        setMessage({ type: 'success', text: data.message });
        setShowPurchaseModal(false);
        setPurInvoiceNumber('');
        setPurSupplierId('');
        fetchPurchases();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error receiving purchase.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateSubtotal = () => {
    return purItems.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0), 0);
  };

  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() - (Number(purDiscount) || 0));
  };

  const totalSpend = purchases.reduce((acc, p) => acc + p.total, 0);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Suppliers & Purchasing</h1>
            <Badge variant="success">
              <PackageCheck className="w-3.5 h-3.5 mr-1" /> Stock Receiving Pipeline
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supplier management, purchase invoice receiving, batch creation, and inventory updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasPermission('purchases.create') && (
            <>
              <Button variant="secondary" size="md" onClick={() => setShowSupplierModal(true)}>
                <Building2 className="w-4 h-4 mr-2" /> Add Supplier
              </Button>
              <Button variant="primary" size="md" onClick={() => setShowPurchaseModal(true)}>
                <Plus className="w-4 h-4 mr-2" /> Receive Purchase Invoice
              </Button>
            </>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Purchasing Spend</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{formatCurrency(totalSpend)}</div>
            <span className="text-[10px] text-slate-500">Cumulative received purchase invoices</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Active Suppliers</span>
              <Building2 className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{suppliers.length} Suppliers</div>
            <span className="text-[10px] text-slate-500">Registered pharmaceutical distributors</span>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Received Invoices</span>
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2">{purchases.length} Invoices</div>
            <span className="text-[10px] text-slate-500">Atomic inventory updates completed</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-900/90 rounded-2xl border border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'purchases'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1.5" /> Purchase Invoices
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'suppliers'
              ? 'bg-brand-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 inline mr-1.5" /> Supplier Directory
        </button>
      </div>

      {activeTab === 'purchases' ? (
        /* Purchase Invoices Table */
        <Card hoverEffect={false} className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading Purchases...</div>
          ) : purchases.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">No purchase invoices received yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5 pl-5">Invoice #</th>
                    <th className="p-3.5">Supplier</th>
                    <th className="p-3.5">Received Date</th>
                    <th className="p-3.5">Items</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="p-3.5 pl-5 font-bold font-mono text-brand-300">{p.invoiceNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-200">{p.supplier?.name || '—'}</td>
                      <td className="p-3.5 text-slate-400">{new Date(p.purchaseDate).toLocaleDateString()}</td>
                      <td className="p-3.5">{p.items?.length || 0} line item(s)</td>
                      <td className="p-3.5 font-bold font-mono text-emerald-400">{formatCurrency(p.total)}</td>
                      <td className="p-3.5">
                        <Badge variant="success" className="text-[10px]">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const res = await fetch(`/api/purchases/${p.id}`);
                            if (res.ok) {
                              const json = await res.json();
                              setSelectedPurchase(json.data.purchase);
                            }
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        /* Suppliers Directory Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <Card key={s.id} hoverEffect>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="font-bold text-slate-100 text-sm">{s.name}</div>
                  <Badge variant="success" className="text-[10px]">
                    Active Supplier
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  {s.contactPerson && <div>Contact: {s.contactPerson}</div>}
                  {s.phone && <div>Phone: {s.phone}</div>}
                  {s.email && <div>Email: {s.email}</div>}
                  {s.address && <div className="truncate">Address: {s.address}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Add Pharmaceutical Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. MedPharma Wholesale"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Contact Person</label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Sarah Jenkins"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Phone</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+251..."
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="orders@supplier.com"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Address</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Street / City address"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowSupplierModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Add Supplier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Purchase Invoice Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Receive Purchase Invoice</h3>
              <button onClick={() => setShowPurchaseModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Select Supplier *</label>
                  <select
                    required
                    value={purSupplierId}
                    onChange={(e) => setPurSupplierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={purInvoiceNumber}
                    onChange={(e) => setPurInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-001"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={purPurchaseDate}
                    onChange={(e) => setPurPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Invoice Line Items</span>
                  <Button variant="outline" size="sm" type="button" onClick={addItemRow}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item Line
                  </Button>
                </div>

                {purItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 relative">
                    {purItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Medicine *</label>
                        <select
                          required
                          value={item.medicineId}
                          onChange={(e) => updateItemRow(idx, 'medicineId', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                        >
                          <option value="">Select Medicine</option>
                          {medicines.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.barcode ? `(${m.barcode})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Batch Number *</label>
                        <input
                          type="text"
                          required
                          value={item.batchNumber}
                          onChange={(e) => updateItemRow(idx, 'batchNumber', e.target.value)}
                          placeholder="e.g. BATCH-A1"
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Expiry Date *</label>
                        <input
                          type="date"
                          required
                          value={item.expiryDate}
                          onChange={(e) => updateItemRow(idx, 'expiryDate', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Qty *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Cost Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.purchasePrice}
                          onChange={(e) => updateItemRow(idx, 'purchasePrice', Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Selling Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.sellingPrice}
                          onChange={(e) => updateItemRow(idx, 'sellingPrice', Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Calculation Bar */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400 mr-2">Subtotal:</span>
                  <span className="text-slate-200">{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Discount ($):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={purDiscount}
                    onChange={(e) => setPurDiscount(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-right"
                  />
                </div>
                <div>
                  <span className="text-slate-400 mr-2">Net Invoice Total:</span>
                  <span className="text-emerald-400 font-bold text-sm">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowPurchaseModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing Purchase & Stock...' : 'Complete & Receive Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Invoice {selectedPurchase.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-400">Supplier: {selectedPurchase.supplier?.name}</p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>Date: {new Date(selectedPurchase.purchaseDate).toLocaleDateString()}</div>
                <div>Received By: {selectedPurchase.createdBy?.fullName || 'User'}</div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-300">Received Line Items & Batches</div>
                {selectedPurchase.items?.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200">{item.medicine?.name}</div>
                      <div className="text-[10px] text-brand-300 font-mono">
                        Batch: {item.batchNumber} (Exp: {new Date(item.expiryDate).toISOString().split('T')[0]})
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div>{item.quantity} units @ ${item.purchasePrice}</div>
                      <div className="font-bold text-emerald-400">{formatCurrency(item.subtotal)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between font-mono font-bold text-slate-100">
                <span>Grand Total:</span>
                <span className="text-emerald-400">{formatCurrency(selectedPurchase.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
