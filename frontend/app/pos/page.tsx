'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  QrCode,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Printer,
  X,
  Sparkles,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MedicineCatalogItem {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  barcode?: string;
  unit: string;
  sellableQuantity: number;
}

interface CartItem {
  medicineId: string;
  name: string;
  barcode?: string;
  strength?: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

interface ReceiptData {
  saleNumber: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  pharmacyName: string;
  receiptHeader?: string;
  receiptFooter?: string;
  items: {
    name: string;
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export default function POSTerminalPage() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<MedicineCatalogItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'DIGITAL'>('CASH');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Receipt Modal State
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const json = await res.json();
        setCatalog(json.data.inventory);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load POS medicine inventory.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const addToCartByBarcode = useCallback(async (scannedCode: string) => {
    try {
      const res = await fetch(`/api/medicines/barcode/${encodeURIComponent(scannedCode)}`);
      if (!res.ok) {
        setMessage({ type: 'error', text: `Product not found for barcode '${scannedCode}'.` });
        return;
      }

      const json = await res.json();
      const med = json.data.medicine;

      // Fetch sellable stock
      const invRes = await fetch(`/api/inventory?search=${encodeURIComponent(med.name)}`);
      let available = 100; // fallback
      let unitPrice = 10.0; // fallback

      if (invRes.ok) {
        const invJson = await invRes.json();
        const foundInv = invJson.data.inventory.find((i: MedicineCatalogItem) => i.id === med.id);
        if (foundInv) {
          available = foundInv.sellableQuantity;
        }
      }

      // Fetch selling price from first active batch
      const batchRes = await fetch(`/api/inventory/medicines/${med.id}/batches`);
      if (batchRes.ok) {
        const batchJson = await batchRes.json();
        if (batchJson.data.batches.length > 0) {
          unitPrice = batchJson.data.batches[0].sellingPrice;
        }
      }

      if (available <= 0) {
        setMessage({ type: 'error', text: `'${med.name}' is currently OUT OF STOCK.` });
        return;
      }

      setCart((prev) => {
        const existingIdx = prev.findIndex((i) => i.medicineId === med.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          if (updated[existingIdx].quantity < updated[existingIdx].availableStock) {
            updated[existingIdx].quantity += 1;
            setMessage({ type: 'success', text: `Incremented '${med.name}' quantity.` });
          } else {
            setMessage({ type: 'error', text: `Maximum available stock reached for '${med.name}'.` });
          }
          return updated;
        }

        setMessage({ type: 'success', text: `Added '${med.name}' to cart.` });
        return [
          ...prev,
          {
            medicineId: med.id,
            name: med.name,
            barcode: med.barcode,
            strength: med.strength,
            unitPrice,
            quantity: 1,
            availableStock: available,
          },
        ];
      });
    } catch {
      setMessage({ type: 'error', text: `Error processing barcode '${scannedCode}'.` });
    }
  }, []);

  // USB Barcode Scanner Handler
  useBarcodeScanner({
    onScan: (scannedCode) => {
      addToCartByBarcode(scannedCode);
    },
  });

  const addToCartFromCatalog = async (item: MedicineCatalogItem) => {
    if (item.sellableQuantity <= 0) {
      setMessage({ type: 'error', text: `'${item.name}' has no available unexpired stock.` });
      return;
    }

    let unitPrice = 10.0;
    try {
      const res = await fetch(`/api/inventory/medicines/${item.id}/batches`);
      if (res.ok) {
        const json = await res.json();
        if (json.data.batches.length > 0) {
          unitPrice = json.data.batches[0].sellingPrice;
        }
      }
    } catch {
      // fallback
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.medicineId === item.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        if (updated[existingIdx].quantity < item.sellableQuantity) {
          updated[existingIdx].quantity += 1;
        }
        return updated;
      }

      return [
        ...prev,
        {
          medicineId: item.id,
          name: item.name,
          barcode: item.barcode,
          strength: item.strength,
          unitPrice,
          quantity: 1,
          availableStock: item.sellableQuantity,
        },
      ];
    });
  };

  const updateQuantity = (idx: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      }
      if (newQty > updated[idx].availableStock) {
        setMessage({ type: 'error', text: `Cannot exceed available sellable stock (${updated[idx].availableStock}).` });
        return prev;
      }
      updated[idx].quantity = newQty;
      return updated;
    });
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = cart.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setMessage(null);

    try {
      const payload = {
        items: cart.map((i) => ({
          medicineId: i.medicineId,
          quantity: i.quantity,
        })),
        discount: Number(discount),
        paymentMethod,
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to complete sale.' });
      } else {
        const completedSale = data.data.sale;

        setReceipt({
          saleNumber: completedSale.saleNumber,
          createdAt: completedSale.createdAt,
          subtotal: completedSale.subtotal,
          discount: completedSale.discount,
          total: completedSale.total,
          paymentMethod: completedSale.paymentMethod,
          pharmacyName: completedSale.organization?.name || user?.organizationName || 'PharmacyOS Desk',
          receiptHeader: completedSale.organization?.settings?.receiptHeader || 'Thank you for your visit!',
          receiptFooter: completedSale.organization?.settings?.receiptFooter || 'Please retain receipt for returns.',
          items: completedSale.items.map((si: { medicine?: { name: string }; batch?: { batchNumber: string }; quantity: number; unitPrice: number; subtotal: number }) => ({
            name: si.medicine?.name || 'Medicine',
            batchNumber: si.batch?.batchNumber || 'N/A',
            quantity: si.quantity,
            unitPrice: si.unitPrice,
            subtotal: si.subtotal,
          })),
        });

        setShowReceiptModal(true);
        setCart([]);
        setDiscount(0);
        fetchCatalog();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error completing sale.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCatalog = catalog.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      (i.barcode && i.barcode.toLowerCase().includes(q)) ||
      (i.genericName && i.genericName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Point of Sale (POS) Terminal</h1>
            <Badge variant="success">
              <QrCode className="w-3.5 h-3.5 mr-1" /> USB Scanner Listening
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Scan package barcode or select medicines to checkout with automatic FEFO batch deductions.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
            message.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* POS Grid: Left Catalog Search, Right Checkout Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Quick Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product catalog or scan USB barcode..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="col-span-full p-8 text-center text-slate-500 text-xs">Loading Catalog...</div>
            ) : filteredCatalog.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-500 text-xs">No matching products.</div>
            ) : (
              filteredCatalog.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCartFromCatalog(item)}
                  disabled={item.sellableQuantity <= 0}
                  className="flex flex-col justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-brand-500/50 hover:bg-slate-850 text-left transition-all group disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-slate-200 group-hover:text-brand-300 line-clamp-2">
                      {item.name}
                    </span>
                    {item.barcode && (
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-slate-400" /> {item.barcode}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-xs">
                    <span className="font-mono text-emerald-400 font-semibold">
                      Stock: {item.sellableQuantity}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-700">
                      + Add
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Interactive Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card hoverEffect={false} className="p-4 border-slate-800 shadow-2xl flex flex-col justify-between min-h-[65vh]">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-brand-400" /> Current Order Cart
                </span>
                <Badge variant="info">{cart.length} item(s)</Badge>
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                  <ShoppingCart className="w-8 h-8 text-slate-700 mx-auto" />
                  <div>Cart is empty</div>
                  <p className="text-[10px] text-slate-600">Scan barcode or tap products on the left to build order.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={item.medicineId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-200 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatCurrency(item.unitPrice)} / unit
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                          <button
                            onClick={() => updateQuantity(idx, -1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono font-bold text-slate-100">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(idx, 1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-bold font-mono text-emerald-400 w-16 text-right">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>

                        <button
                          onClick={() => removeFromCart(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Summary & Payment Controls */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Discount ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-20 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-right text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between font-bold text-slate-100 text-sm pt-1 border-t border-slate-800">
                  <span>Grand Total</span>
                  <span className="text-emerald-400">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                    paymentMethod === 'CARD'
                      ? 'bg-brand-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DIGITAL')}
                  className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                    paymentMethod === 'DIGITAL'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Digital
                </button>
              </div>

              <Button
                variant="primary"
                size="lg"
                disabled={cart.length === 0 || isProcessing}
                onClick={handleCompleteSale}
                className="w-full text-base py-3"
              >
                {isProcessing ? 'Deducting Stock & Processing...' : `Complete Sale (${formatCurrency(grandTotal)})`}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sale Receipt Generated
              </span>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Card Body */}
            <div className="p-5 rounded-2xl bg-white text-slate-900 font-mono text-xs space-y-3 shadow-inner">
              <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                <div className="font-extrabold text-sm uppercase tracking-wider">{receipt.pharmacyName}</div>
                {receipt.receiptHeader && <div className="text-[10px] text-slate-600">{receipt.receiptHeader}</div>}
                <div className="text-[10px] text-slate-500 pt-1">
                  Sale #: <span className="font-bold">{receipt.saleNumber}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Date: {new Date(receipt.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 border-b border-slate-200 pb-3">
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <div className="text-[9px] text-slate-500">
                        Batch: {item.batchNumber} | {item.quantity} x ${item.unitPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="font-bold">${item.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-right text-xs border-b border-slate-200 pb-2">
                <div>Subtotal: ${receipt.subtotal.toFixed(2)}</div>
                {receipt.discount > 0 && <div>Discount: -${receipt.discount.toFixed(2)}</div>}
                <div className="font-bold text-sm pt-1">
                  TOTAL ({receipt.paymentMethod}): ${receipt.total.toFixed(2)}
                </div>
              </div>

              {receipt.receiptFooter && (
                <div className="text-center text-[9px] text-slate-500 pt-1">
                  {receipt.receiptFooter}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Receipt
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowReceiptModal(false)}>
                Done / Next Sale
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
